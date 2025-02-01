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
    # from axiom_py import Client
    # from axiom_py.structlog import AxiomProcessor

    # axiom_client = Client()

    structlog.configure(
        processors=[
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso", key="_time"),
            structlog.processors.JSONRenderer(),
            # AxiomProcessor(axiom_client, "DATASET_NAME"),
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
            "reactivex",
            "axiom-py",
            "structlog",
            "onnxruntime",
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


with inference_image.imports():
    from reactivex.observer import Observer
    from pyannote.core import Annotation

    from diart.sources import AudioSource
    from diart.inference import StreamingInference

    class DiarizationSegment(BaseModel):
        speaker: str
        start: int
        end: int

    # https://github.com/juanmc2005/diart/blob/e9dae1a/src/diart/sources.py
    class Source(AudioSource):
        def __init__(self, sample_rate: int):
            super().__init__("websocket_source", sample_rate)

        def read(self):
            pass

        def write(self, data: np.ndarray):
            self.stream.on_next(data)

        def close(self):
            self.stream.on_completed()

    # https://github.com/juanmc2005/diart/blob/e9dae1a/src/diart/sinks.py
    # https://github.com/pyannote/pyannote-core/blob/develop/pyannote/core/annotation.py
    # https://pyannote.github.io/pyannote-core/structure.html
    class Sender(Observer):
        def __init__(self, logger: Any, websocket: WebSocket):
            super().__init__()
            self.logger = logger
            self.websocket = websocket
            self.patch_collar = 0.5
            self._prediction = None
            self._sent_segments = set()
            self.loop = asyncio.get_running_loop()

        def _extract_prediction(self, value: Union[Tuple, Annotation]) -> Annotation:
            if isinstance(value, tuple):
                return value[0]
            if isinstance(value, Annotation):
                return value

        def _process(self):
            for segment, _track, label in self._prediction.itertracks(yield_label=True):
                (start, end) = (int(segment.start * 1000), int(segment.end * 1000))
                segment_key = (start, end, label)

                if segment_key not in self._sent_segments:
                    self._sent_segments.add(segment_key)

                    item = DiarizationSegment(start=start, end=end, speaker=label)
                    data = item.model_dump_json()

                    asyncio.run_coroutine_threadsafe(
                        self.websocket.send_text(data), self.loop
                    )

        def on_next(self, value: Union[Tuple, Annotation]):
            prediction = self._extract_prediction(value)

            try:
                if self._prediction is None:
                    self._prediction = prediction
                else:
                    self._prediction.update(prediction)
                self._prediction = self._prediction.support(self.patch_collar)
            except Exception as e:
                self.logger.error(e)

            self._process()


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
            step=0.5,
        )
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
    ):
        if token != os.getenv("HYPRNOTE_API_KEY"):
            raise HTTPException(status_code=401)

        await websocket.accept()
        self.logger.info("websocket_connected")

        source = Source(sample_rate=sample_rate)
        sender = Sender(
            logger=self.logger,
            websocket=websocket,
        )

        inference = StreamingInference(
            self.pipeline,
            source,
            do_profile=False,
            do_plot=False,
            show_progress=False,
        )
        inference.attach_observers(sender)

        async def run_inference():
            await asyncio.to_thread(inference.__call__)

        inference_task = asyncio.create_task(run_inference())

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
            source.close()
            await inference_task
            await websocket.close()
        except:
            pass


@app.function(image=download_image, volumes={MODEL_DIR: cache_volume})
def download_model():
    from huggingface_hub import snapshot_download

    loc = snapshot_download(
        repo_id=EMBEDDING_MODEL_REPO_ID,
        local_dir=MODEL_DIR / EMBEDDING_MODEL_REPO_ID,
        token=os.getenv("HF_TOKEN"),
    )
    print(f"Saved model to {loc}")

    loc = snapshot_download(
        repo_id=SEGMENTATION_MODEL_REPO_ID,
        local_dir=MODEL_DIR / SEGMENTATION_MODEL_REPO_ID,
        token=os.getenv("HF_TOKEN"),
    )
    print(f"Saved model to {loc}")
