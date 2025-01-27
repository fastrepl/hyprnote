import modal

from pydantic import BaseModel
from typing import Annotated
import asyncio

from fastapi import FastAPI, WebSocket, HTTPException, Query, Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

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
    .pip_install(["diart", "fastapi", "pydantic", "reactivex"])
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


class Params(BaseModel):
    sample_rate: int = 16000


@web_app.websocket("/diarize")
async def diarize(
    websocket: WebSocket,
    params: Annotated[Params, Query()],
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
):
    import os

    if credentials.credentials != os.getenv("HYPRNOTE_API_KEY"):
        raise HTTPException(status_code=401)

    from diart import SpeakerDiarizationConfig, SpeakerDiarization
    from diart.sources import AudioSource
    from diart.inference import StreamingInference

    import reactivex as rx
    from reactivex.observer import Observer

    class Source(AudioSource):
        def __init__(self, websocket: WebSocket):
            super().__init__("websocket_source", params.sample_rate)
            self.websocket = websocket
            self.buffer = asyncio.Queue()

        async def receive(self):
            data = await self.websocket.receive_bytes()
            self.buffer.put(data)

        def read(self):
            try:
                return self.buffer.get_nowait()
            except asyncio.QueueEmpty:
                return None

    # https://github.com/juanmc2005/diart/blob/e9dae1a/src/diart/sinks.py
    # https://github.com/pyannote/pyannote-core/blob/develop/pyannote/core/annotation.py
    # https://pyannote.github.io/pyannote-core/structure.html
    class Sender(Observer):
        def __init__(self, websocket: WebSocket):
            self.websocket = websocket

        def on_next(self, value):
            self.websocket.send_bytes(value)

    await websocket.accept()
    source = Source(websocket)
    sender = Sender(websocket)

    # https://github.com/juanmc2005/diart/blob/e9dae1a/src/diart/blocks/diarization.py
    config = SpeakerDiarizationConfig(duration=5, step=1)
    pipeline = SpeakerDiarization(config)
    inference = StreamingInference(pipeline, source, show_progress=False)
    inference.attach_observers(sender)

    while True:
        await source.receive()


@web_app.get("/health")
async def health():
    return {"status": "ok"}


@app.function(allow_concurrent_inputs=10)
@modal.asgi_app()
def main():
    return web_app
