import argparse
import os
import threading
import time
import wave

from deepgram import DeepgramClient
from deepgram.core.events import EventType
from deepgram.environment import DeepgramClientEnvironment
from deepgram.extensions.types.sockets import (
    ListenV1ControlMessage,
    ListenV1MediaMessage,
)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", required=True)
    parser.add_argument("--api-base", required=True)
    parser.add_argument("--api-key", required=True)
    parser.add_argument("--model", default="nova-3")
    args = parser.parse_args()

    if not os.path.exists(args.file):
        print(f"Error: File not found: {args.file}")
        return

    process_audio_file(args.file, args.api_base, args.api_key, args.model)


def process_audio_file(audio_file, api_base, api_key, model="nova-3"):
    chunk_size = 2048

    try:
        with wave.open(audio_file, "rb") as wav_file:
            sample_rate = wav_file.getframerate()
            sample_width = wav_file.getsampwidth()
            n_channels = wav_file.getnchannels()
            frames_per_chunk = chunk_size // (sample_width * n_channels)

            env = DeepgramClientEnvironment(
                base=api_base,
                production=api_base,
                agent=api_base,
            )
            deepgram = DeepgramClient(api_key=api_key, environment=env)

            def on_message(message, **kwargs):
                if not hasattr(message, "channel") or not message.channel:
                    return

                channel_idx = (
                    message.channel_index[0]
                    if hasattr(message, "channel_index") and message.channel_index
                    else 0
                )
                alternatives = message.channel.alternatives
                if not alternatives:
                    return

                transcript = alternatives[0].transcript
                if not transcript:
                    return

                is_final = hasattr(message, "is_final") and message.is_final
                speech_final = hasattr(message, "speech_final") and message.speech_final

                if is_final and speech_final:
                    status = "F"
                elif is_final:
                    status = "f"
                else:
                    status = "p"
                print(f"{channel_idx}{status} {transcript}")

            with deepgram.listen.v1.connect(
                model=model,
                encoding="linear16",
                sample_rate=str(sample_rate),
                channels=str(n_channels),
                interim_results="true",
            ) as connection:

                def on_error(error):
                    print(f"Error: {error}")

                connection.on(EventType.ERROR, on_error)
                connection.on(EventType.MESSAGE, on_message)

                listener_errors = []

                def run_listener():
                    try:
                        connection.start_listening()
                    except Exception as exc:
                        listener_errors.append(exc)

                listener_thread = threading.Thread(target=run_listener, daemon=True)
                listener_thread.start()
                time.sleep(0.1)

                while True:
                    chunk = wav_file.readframes(frames_per_chunk)
                    if not chunk:
                        break
                    connection.send_media(ListenV1MediaMessage(chunk))
                    time.sleep(0.05)

                connection.send_control(ListenV1ControlMessage(type="Finalize"))

                listener_thread.join(timeout=1)

                if listener_errors:
                    raise listener_errors[0]

    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    main()
