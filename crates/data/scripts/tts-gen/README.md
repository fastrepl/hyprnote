# TTS Generation Tool

A dev-only tool for generating test audio files using the ElevenLabs TTS API.

## Prerequisites

- Rust toolchain
- ElevenLabs API key

## Setup

```bash
export ELEVENLABS_API_KEY=your_api_key_here
```

## Usage

```bash
cd crates/data/scripts/tts-gen
cargo run -- --help
```

### Generate German Test Audio

```bash
cargo run -- \
  --text "Guten Tag, wie geht es Ihnen heute?" \
  --output ../../src/german_1 \
  --name german_1 \
  --language de
```

### Generate Korean Test Audio

```bash
cargo run -- \
  --text "안녕하세요, 오늘 날씨가 좋네요." \
  --output ../../src/korean_3 \
  --name korean_3 \
  --language ko
```

### Generate English+Korean Mixed Audio

```bash
cargo run -- \
  --text "Hello, 안녕하세요. How are you? 잘 지내세요?" \
  --output ../../src/mixed_en_ko_1 \
  --name mixed_en_ko_1
```

## Output Files

The tool generates the following files in the output directory:

- `audio.wav` - 16kHz mono WAV audio file
- `transcription.json` - Word-level transcription with estimated timestamps
- `diarization.json` - Speaker diarization (single speaker)

## Models

The default model is `eleven_multilingual_v2` which supports 29 languages including:
- English (en)
- German (de)
- Korean (ko)
- Japanese (ja)
- Chinese (zh)
- And many more...

## Voices

Default voice is Rachel (21m00Tcm4TlvDq8ikWAM). You can use any ElevenLabs voice ID.

Some recommended voices for multilingual content:
- Rachel: 21m00Tcm4TlvDq8ikWAM (female, neutral)
- Adam: pNInz6obpgDQGcFmaJgB (male, American)
- Antoni: ErXwobaYiN019PkySvjV (male, neutral)
