# OWhisper

> Something like Ollama, but for realtime speech-to-text.

## Get started

### Homebrew

```bash
# install owhisper CLI
brew tap fastrepl/hyprnote && brew install owhisper
```

```bash
# download example config
curl -L -o ./config.json https://raw.githubusercontent.com/fastrepl/hyprnote/refs/heads/main/owhisper/owhisper-config/examples/cli.json
```

```bash
# serve it with owhisper
owhisper serve --config ./config.json --port 8080
```

### Docker

```bash
# download model for whisper.cpp
curl -L -o ./ggml-base.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin
```

```bash
# download example config
curl -L -o ./config.json https://raw.githubusercontent.com/fastrepl/hyprnote/refs/heads/main/owhisper/owhisper-config/examples/docker.json
```

```bash
# serve it with owhisper
docker run --rm -it -p 8080:8080 \
  -v $(pwd)/config.json:/app/assets/config.json:ro \
  -v $(pwd)/ggml-base.bin:/app/assets/ggml-base.bin:ro \
  ghcr.io/fastrepl/owhisper:latest \
  serve --config /app/assets/config.json --port 8080
```
