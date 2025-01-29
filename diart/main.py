import modal
import numpy as np

from pydantic import BaseModel
from typing import Annotated, Union, Tuple
import asyncio
import queue
import json

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
    logger = get_logger()
    # import os

    # if credentials.credentials != os.getenv("HYPRNOTE_API_KEY"):
    #     raise HTTPException(status_code=401)

    from pyannote.core import Annotation
    from diart import SpeakerDiarizationConfig, SpeakerDiarization
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
                data = np.array(data, dtype=np.int16)
                data = (data / 32768.0).astype(np.float32)
                data = np.array(data, dtype=np.float32).reshape(1, -1)
                self.buffer.put(data)

        def read(self):
            while not self.is_closed:
                try:
                    chunk = self.buffer.get(block=True, timeout=15)
                    if chunk is not None:
                        self.stream.on_next(chunk)
                except Exception as e:
                    logger.error(e)
                    self.stream.on_error(e)
                    break
            self.stream.on_completed()

        def close(self):
            self.is_closed = True
            asyncio.create_task(self.websocket.close())

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
            try:
                self.loop = asyncio.get_running_loop()
            except RuntimeError:
                self.loop = asyncio.get_event_loop()

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

                    try:
                        asyncio.run_coroutine_threadsafe(
                            self.websocket.send_text(data), self.loop
                        )
                    except Exception as e:
                        logger.error(e)

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

    # https://github.com/juanmc2005/diart/blob/e9dae1a/src/diart/blocks/diarization.py
    config = SpeakerDiarizationConfig(duration=5, step=1)
    pipeline = SpeakerDiarization(config)
    inference = StreamingInference(pipeline, source, show_progress=False)
    inference.attach_observers(sender)
    asyncio.create_task(asyncio.to_thread(inference))

    while True:
        try:
            await source.receive()
        except WebSocketDisconnect:
            logger.info("websocket_disconnected")
            break
        except Exception as e:
            logger.error(e)
            break


@web_app.get("/health")
async def health():
    return {"status": "ok"}


@app.function(allow_concurrent_inputs=10, container_idle_timeout=30)
@modal.asgi_app()
def main():
    return web_app
