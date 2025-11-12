#!/bin/bash

set -e

if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <sample_rate> <output_path>"
  echo "Example: $0 24000 audio.wav"
  exit 1
fi

SAMPLE_RATE=$1
OUTPUT_PATH=$2

curl -L -o jfk.wav https://github.com/ggml-org/whisper.cpp/raw/refs/heads/master/samples/jfk.wav
ffmpeg -i jfk.wav -ar "${SAMPLE_RATE}" -ac 1 -c:a pcm_s16le "${OUTPUT_PATH}"
rm jfk.wav
