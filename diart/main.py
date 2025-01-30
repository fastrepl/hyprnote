import modal
import numpy as np

from pydantic import BaseModel
from typing import Union, Tuple
import asyncio
import queue
import json
import os

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


EMBEDDING_MODEL_REPO_ID = "nvidia/speakerverification_en_titanet_large"
SEGMENTATION_MODEL_REPO_ID = "pyannote/segmentation-3.0"
MODEL_DIR = "/cache"

cache_volume = modal.Volume.from_name("hf-hub-cache", create_if_missing=True)

image = (
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
    # .env({"HF_HUB_CACHE": MODEL_DIR})
)


app = modal.App(
    name="hyprnote-diart",
    image=image,
    secrets=[
        modal.Secret.from_name("huggingface"),
        modal.Secret.from_name("hyprnote"),
    ],
)

web_app = FastAPI()
security = HTTPBearer()


class DiarizationSegment(BaseModel):
    speaker: str
    start: float
    end: float


@web_app.websocket("/diarize")
async def diarize(
    websocket: WebSocket,
    # credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    sample_rate: int,
):
    # if credentials.credentials != os.getenv("HYPRNOTE_API_KEY"):
    #     raise HTTPException(status_code=401)

    logger = get_logger()

    from pyannote.core import Annotation
    from diart import SpeakerDiarizationConfig, SpeakerDiarization
    from diart import models
    from diart.sources import AudioSource
    from diart.inference import StreamingInference
    from reactivex.observer import Observer

    # https://github.com/juanmc2005/diart/blob/e9dae1a/src/diart/sources.py
    class Source(AudioSource):
        def __init__(self, websocket: WebSocket):
            super().__init__("websocket_source", sample_rate)
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
                    logger.error(e)
                    self.stream.on_error(e)
                    break

        def close(self):
            self.is_closed = True
            self.stream.on_completed()

    # https://github.com/juanmc2005/diart/blob/e9dae1a/src/diart/sinks.py
    # https://github.com/pyannote/pyannote-core/blob/develop/pyannote/core/annotation.py
    # https://pyannote.github.io/pyannote-core/structure.html
    class Sender(Observer):
        def __init__(self, websocket: WebSocket):
            super().__init__()
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
                logger.error(e)

            self._process()

    await websocket.accept()

    source = Source(websocket)
    sender = Sender(websocket)
    # segmentation = models.SegmentationModel.from_pretrained(SEGMENTATION_MODEL_REPO_ID)
    # embedding = models.EmbeddingModel.from_pretrained(EMBEDDING_MODEL_REPO_ID)

    # https://github.com/juanmc2005/diart/blob/e9dae1a/src/diart/console/serve.py
    # https://github.com/juanmc2005/diart/blob/e9dae1a/src/diart/blocks/diarization.py
    config = SpeakerDiarizationConfig(
        # segmentation=segmentation,
        # embedding=embedding,
        duration=5,
        step=1,
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
            logger.info("websocket_disconnected")
            break
        except Exception as e:
            logger.error(e)
            break

    await inference_task

    try:
        await websocket.close()
    except:
        pass


@web_app.get("/health")
async def health():
    return {"status": "ok"}


@app.function(
    volumes={MODEL_DIR: cache_volume},
    allow_concurrent_inputs=10,
    container_idle_timeout=30,
    # gpu="A10G",
)
@modal.asgi_app()
def main():
    return web_app


# @app.function(volumes={MODEL_DIR: cache_volume})
# def download_model():
#     import huggingface_hub

#     loc = huggingface_hub.snapshot_download(
#         repo_id=EMBEDDING_MODEL_REPO_ID, token=os.getenv("HF_TOKEN")
#     )
#     print(f"Saved model to {loc}")

#     loc = huggingface_hub.snapshot_download(
#         repo_id=SEGMENTATION_MODEL_REPO_ID, token=os.getenv("HF_TOKEN")
#     )
#     print(f"Saved model to {loc}")
