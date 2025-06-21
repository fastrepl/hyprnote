# Audio Chunker

This crate provides intelligent audio chunking for real-time speech processing, specifically designed for Whisper STT integration.

## Features

- **Silero VAD-based chunking**: Advanced voice activity detection using neural networks
- **RMS-based chunking**: Simple fallback option for lightweight processing
- **Adaptive thresholding**: Dynamically adjusts sensitivity based on audio conditions
- **Configurable durations**: Support for up to 30-second chunks (Whisper's optimal size)
- **Silence trimming**: Removes leading and trailing silence to prevent hallucinations
- **Thread-safe**: All predictors implement Send + Sync for concurrent use

## Usage

### Basic Usage with RMS

```rust
use chunker::{ChunkerExt, RMS};
use std::time::Duration;

let audio_source = /* your audio source */;
let chunked = audio_source.chunks(RMS::new(), Duration::from_secs(15));
```

### Advanced Usage with Silero VAD

```rust
use chunker::{ChunkerExt, Silero, SileroConfig};
use std::time::Duration;

// Use default configuration
let silero = Silero::new()?;
let chunked = audio_source.chunks(silero, Duration::from_secs(30));

// Or with custom configuration
let config = SileroConfig {
    base_threshold: 0.5,
    confidence_window_size: 10,
    high_confidence_threshold: 0.7,
    high_confidence_speech_threshold: 0.4,
    low_confidence_speech_threshold: 0.6,
};
let silero = Silero::with_config(config)?;
```

## Configuration

### ChunkConfig

- `max_duration`: Maximum chunk duration (default: 30s)
- `min_buffer_duration`: Minimum buffer before considering splits (default: 6s)
- `silence_window_duration`: Silence duration to trigger split (default: 500ms)
- `trim_window_size`: Window size for silence trimming (default: 100 samples)

### SileroConfig

- `base_threshold`: Default VAD threshold (0.0-1.0)
- `confidence_window_size`: History window for adaptation
- `high_confidence_threshold`: Threshold to detect clear speech
- `high_confidence_speech_threshold`: VAD threshold in clear conditions
- `low_confidence_speech_threshold`: VAD threshold in noisy conditions

## Implementation Details

The Silero VAD implementation:
- Uses ONNX runtime for efficient neural network inference
- Maintains LSTM state for temporal consistency
- Automatically resets state after extended silence
- Adapts thresholds based on recent confidence history