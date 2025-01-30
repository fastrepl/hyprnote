import modal
import numpy as np

from pydantic import BaseModel
from typing import Union, Tuple, Any
import asyncio
import queue
import json
import os
from pathlib import Path

from fastapi import (
    FastAPI,
    WebSocket,
    HTTPException,
    Query,
    Depends,
    WebSocketDisconnect,
)
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer


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


EMBEDDING_MODEL_REPO_ID = "pyannote/embedding"
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
            "huggingface-hub",
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
    from diart import models, SpeakerDiarizationConfig, SpeakerDiarization

    class DiarizationSegment(BaseModel):
        speaker: str
        start: float
        end: float

    # https://github.com/juanmc2005/diart/blob/e9dae1a/src/diart/sources.py
    class Source(AudioSource):
        def __init__(self, logger: Any, websocket: WebSocket, sample_rate: int):
            super().__init__("websocket_source", sample_rate)
            self.logger = logger
            self.websocket = websocket
            self.buffer = queue.Queue()
            self.is_closed = False
            self.loop = asyncio.get_event_loop()

        async def receive(self):
            msg = await self.websocket.receive_text()
            if msg is not None:
                data = json.loads(msg)["audio"]
                data = np.frombuffer(bytes(data), dtype=np.int16)
                data = (data / 32768.0).astype(np.float32)
                data = np.array(data, dtype=np.float32).reshape(1, -1)
                self.buffer.put(data)

        def read(self):
            while not self.is_closed:
                try:
                    chunk = self.buffer.get(block=True, timeout=15)
                    if chunk is not None:
                        self.stream.on_next(chunk)
                except queue.Empty:
                    self.stream.on_completed()
                    break
                except Exception as e:
                    self.stream.on_error(e)
                    break

        def close(self):
            self.is_closed = True
            self.stream.on_completed()

    # https://github.com/juanmc2005/diart/blob/e9dae1a/src/diart/sinks.py
    # https://github.com/pyannote/pyannote-core/blob/develop/pyannote/core/annotation.py
    # https://pyannote.github.io/pyannote-core/structure.html
    class Sender(Observer):
        def __init__(self, logger: Any, websocket: WebSocket):
            super().__init__()
            self.logger = logger
            self.websocket = websocket
            self.patch_collar = 1
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
                segment_key = (segment.start, segment.end, label)

                if segment_key not in self._sent_segments:
                    item = DiarizationSegment(
                        start=segment.start,
                        end=segment.end,
                        speaker=label,
                    )
                    print("item", item)

                    self._sent_segments.add(segment_key)
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
    container_idle_timeout=30,
    gpu="T4",
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

        self.segmentation = models.SegmentationModel.from_pretrained(
            SEGMENTATION_MODEL_REPO_ID
        )
        self.embedding = models.EmbeddingModel.from_pretrained(EMBEDDING_MODEL_REPO_ID)

    @modal.asgi_app()
    def serve(self):
        return self.web_app

    async def health(self):
        return {"status": "ok"}

    async def diarize(self, websocket: WebSocket):
        await websocket.accept()

        source = Source(
            logger=self.logger,
            websocket=websocket,
            sample_rate=16000,
        )
        sender = Sender(
            logger=self.logger,
            websocket=websocket,
        )

        # https://github.com/juanmc2005/diart/blob/e9dae1a/src/diart/console/serve.py
        # https://github.com/juanmc2005/diart/blob/e9dae1a/src/diart/blocks/diarization.py
        config = SpeakerDiarizationConfig(
            segmentation=self.segmentation,
            embedding=self.embedding,
            duration=5,
            step=0.5,
        )
        pipeline = SpeakerDiarization(config)
        inference = StreamingInference(
            pipeline,
            source,
            batch_size=1,
            do_profile=True,
            do_plot=False,
            show_progress=False,
        )
        inference.attach_observers(sender)

        async def run_inference():
            await asyncio.to_thread(inference.__call__)

        inference_task = asyncio.create_task(run_inference())

        while True:
            try:
                await source.receive()
            except WebSocketDisconnect:
                self.logger.info("websocket_disconnected")
                break
            except Exception as e:
                self.logger.error(e)
                break

        await inference_task

        try:
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
