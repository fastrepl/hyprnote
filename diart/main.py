import os
import json
import asyncio
from pathlib import Path
from typing import Union, Tuple, Any

import modal
import numpy as np
from pydantic import BaseModel
from fastapi import (
    FastAPI,
    WebSocket,
    Query,
    WebSocketDisconnect,
    HTTPException,
)


def get_logger():
    import structlog

    structlog.configure(
        processors=[
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso", key="_time"),
            structlog.processors.JSONRenderer(),
        ]
    )

    return structlog.get_logger()


EMBEDDING_MODEL_REPO_ID = "hbredin/wespeaker-voxceleb-resnet34-LM"
SEGMENTATION_MODEL_REPO_ID = "pyannote/segmentation-3.0"
MODEL_DIR = Path("/cache")

cache_volume = modal.Volume.from_name("hf-hub-cache", create_if_missing=True)

download_image = (
    modal.Image.debian_slim()
    .pip_install("huggingface_hub[hf_transfer]")
    .env({"HF_HUB_ENABLE_HF_TRANSFER": "1"})
)

inference_image = (
    modal.Image.micromamba(python_version="3.10")
    .micromamba_install(
        [
            "portaudio=19.6.*",
            "pysoundfile=0.12.*",
            "ffmpeg<4.4",
        ],
        channels=["conda-forge", "defaults"],
    )
    .pip_install(
        [
            "diart",
            "fastapi",
            "pydantic>=2.0",
            "structlog",
            "onnxruntime",
            "rx",
        ]
    )
    .env({"HF_HUB_CACHE": "/cache"})
)


app = modal.App(
    name="hyprnote-diart",
    secrets=[
        modal.Secret.from_name("huggingface"),
        modal.Secret.from_name("hyprnote"),
    ],
)


@app.cls(
    image=inference_image,
    volumes={MODEL_DIR: cache_volume},
    allow_concurrent_inputs=10,
    container_idle_timeout=1200,
    enable_memory_snapshot=True,
)
class Server:
    def __init__(self):
        self.logger = get_logger()
        self.web_app = FastAPI()
        self.web_app.add_api_route("/", self.health)
        self.web_app.add_api_websocket_route("/diarize", self.diarize)

    @modal.enter()
    def setup(self):
        from diart import models
        from diart import models, SpeakerDiarizationConfig, SpeakerDiarization

        embedding = models.EmbeddingModel.from_pretrained(EMBEDDING_MODEL_REPO_ID)
        segmentation = models.SegmentationModel.from_pretrained(
            SEGMENTATION_MODEL_REPO_ID
        )

        # https://github.com/juanmc2005/diart/blob/e9dae1a/src/diart/console/serve.py
        # https://github.com/juanmc2005/diart/blob/e9dae1a/src/diart/blocks/diarization.py
        config = SpeakerDiarizationConfig(
            segmentation=segmentation,
            embedding=embedding,
            duration=5,
            step=0.6,
            tau_active=0.5,
            rho_update=0.1,
            delta_new=0.8,
        )
        self.config = config
        self.pipeline = SpeakerDiarization(config)

    @modal.asgi_app()
    def serve(self):
        return self.web_app

    async def health(self):
        return {"status": "ok"}

    async def diarize(
        self,
        websocket: WebSocket,
        token: str = Query(None),
        sample_rate: int = Query(16000),
        max_speakers: int = Query(2),
    ):
        if token != os.getenv("HYPRNOTE_API_KEY"):
            raise HTTPException(status_code=401)

        await websocket.accept()
        self.logger.info("websocket_connected")

        import traceback
        import rx.operators as ops
        import diart.operators as dops
        from diart.sources import AudioSource
        from pyannote.core import (
            Annotation,
            SlidingWindowFeature,
            SlidingWindow,
        )

        # https://github.com/juanmc2005/diart/blob/e9dae1a/src/diart/blocks/diarization.py#L153
        self.pipeline._config.max_speakers = max_speakers
        self.pipeline.reset()

        class DiarizationSegment(BaseModel):
            speaker: str
            start: int
            end: int

        # https://github.com/juanmc2005/diart/blob/e9dae1a/src/diart/sources.py
        class SimpleSource(AudioSource):
            def __init__(self, sample_rate: int):
                super().__init__("simple_source", sample_rate)

            def read(self):
                pass

            def write(self, data: np.ndarray):
                self.stream.on_next(data)

            def close(self):
                self.stream.on_completed()

        source = SimpleSource(sample_rate=sample_rate)

        # https://gist.github.com/juanmc2005/ed6413e697e176cb36a149d8c40a3a5b#file-diart_whisper-py-L17
        def concat(chunks, collar=0.05):
            first_annotation = chunks[0][0]
            first_waveform = chunks[0][1]
            annotation = Annotation(uri=first_annotation.uri)
            data = []
            for ann, wav in chunks:
                annotation.update(ann)
                data.append(wav.data)
            annotation = annotation.support(collar)
            window = SlidingWindow(
                first_waveform.sliding_window.duration,
                first_waveform.sliding_window.step,
                first_waveform.sliding_window.start,
            )
            data = np.concatenate(data, axis=0)
            return annotation, SlidingWindowFeature(data, window)

        # https://gist.github.com/juanmc2005/ed6413e697e176cb36a149d8c40a3a5b#file-diart_whisper-py-L162
        stream = source.stream.pipe(
            dops.rearrange_audio_stream(
                duration=self.config.duration,
                step=self.config.step,
                sample_rate=self.config.sample_rate,
            ),
            ops.buffer_with_count(count=1),
            ops.map(self.pipeline),
            ops.map(concat),
        )

        loop = asyncio.get_running_loop()

        def handle_on_next(value: Tuple[Annotation, SlidingWindowFeature]):
            annotation, _feature = value
            for segment, _track, label in annotation.itertracks(yield_label=True):
                (start, end) = (int(segment.start * 1000), int(segment.end * 1000))
                segment = DiarizationSegment(start=start, end=end, speaker=label)
                msg = segment.model_dump_json()
                asyncio.run_coroutine_threadsafe(websocket.send_text(msg), loop)

        subscription = stream.subscribe(
            on_next=handle_on_next, on_error=lambda _: traceback.print_exc()
        )

        while True:
            try:
                msg = await websocket.receive_text()
                if msg is not None:
                    data = json.loads(msg)["audio"]
                    data = np.frombuffer(bytes(data), dtype=np.int16)
                    data = (data / 32768.0).astype(np.float32)
                    data = np.array(data, dtype=np.float32).reshape(1, -1)
                    source.write(data)
            except WebSocketDisconnect:
                self.logger.info("websocket_disconnected")
                break
            except Exception as e:
                self.logger.error(e)
                break

        try:
            subscription.dispose()
            source.close()
            await websocket.close()
        except:
            pass


@app.function(image=download_image, volumes={MODEL_DIR: cache_volume})
def download_model():
    from huggingface_hub import snapshot_download

    embedding_loc = snapshot_download(
        repo_id=EMBEDDING_MODEL_REPO_ID,
        local_dir=MODEL_DIR / EMBEDDING_MODEL_REPO_ID,
        token=os.getenv("HF_TOKEN"),
    )

    segmentation_loc = snapshot_download(
        repo_id=SEGMENTATION_MODEL_REPO_ID,
        local_dir=MODEL_DIR / SEGMENTATION_MODEL_REPO_ID,
        token=os.getenv("HF_TOKEN"),
    )

    print(f"Saved model to {embedding_loc} and {segmentation_loc}")
