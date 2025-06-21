# Audio Chunker

This crate provides intelligent audio chunking for real-time speech processing, specifically designed for Whisper STT integration.

## Features

- **Silero VAD-based chunking**: Advanced voice activity detection using neural networks
- **RMS-based chunking**: Simple fallback option for lightweight processing
- **Adaptive thresholding**: Dynamically adjusts sensitivity based on audio conditions
- **Configurable durations**: Support for up to 30-second chunks (Whisper's optimal size)
- **Multi-stage silence trimming**: Aggressive removal of trailing silence to prevent Whisper hallucinations
- **Hallucination prevention levels**: Normal, Aggressive, and Paranoid modes for different use cases
- **Energy-based validation**: Ensures detected speech has sufficient energy
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

> **Note:** Silero VAD expects input chunks ≥ 480 samples (~30 ms @16 kHz). Ensure your source buffer or `trim_window_size` meets this minimum.

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
    high_confidence_speech_threshold: 0.35,
    low_confidence_speech_threshold: 0.55,
};
let silero = Silero::with_config(config)?;
```

## Configuration

### ChunkConfig

- `max_duration`: Maximum chunk duration (default: 30s)
- `min_buffer_duration`: Minimum buffer before considering splits (default: 6s)
- `silence_window_duration`: Silence duration to trigger split (default: 500ms)
- `trim_window_size`: Window size for silence trimming (default: 480 samples)

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

### Silence Trimming

The chunker implements aggressive silence trimming to prevent Whisper hallucinations:
- Scans backwards from the end to find the last speech segment
- Adds a 60ms safety margin after the last detected speech
- Removes any audio after 300ms of consecutive silence
- This prevents Whisper from generating phantom phrases like "Thank you" from trailing silence

## Hallucination Prevention Guide

Whisper models (especially v3) are prone to generating phantom phrases like "Thank you", "Thanks for watching", or "Please subscribe" when processing audio with trailing silence or low-energy noise. This chunker provides multiple strategies to combat this:

### Prevention Levels

```rust
use chunker::{ChunkConfig, HallucinationPreventionLevel};

// Default: Aggressive mode - enhanced trimming to prevent hallucinations
let config = ChunkConfig::default();

// Normal mode - standard VAD-based trimming (less aggressive)
let config = ChunkConfig::default()
    .with_hallucination_prevention(HallucinationPreventionLevel::Normal);

// Paranoid mode - maximum trimming, may cut trailing words
let config = ChunkConfig::default()
    .with_hallucination_prevention(HallucinationPreventionLevel::Paranoid);
```

### How It Works

#### 1. Multi-Stage Trimming
- **Stage 1**: Standard VAD-based silence detection
- **Stage 2**: Energy-based validation (removes low-energy segments)
- **Stage 3**: Hallucination trigger detection (identifies problematic patterns)
- **Stage 4**: Fade-out application for smooth endings

#### 2. Position-Aware Processing
The chunker is more aggressive in the final seconds of audio:
- **Last 3 seconds**: "Danger zone" with stricter thresholds
- **Last 1 second**: "Critical zone" with minimal safety margins
- **Earlier audio**: Normal processing with standard margins

#### 3. Energy Validation
- Calculates RMS energy across the chunk
- Validates that detected "speech" has sufficient energy
- Detects energy cliffs (sudden drops) that indicate speech end
- Removes segments below dynamic energy thresholds

#### 4. Hallucination Trigger Detection
Identifies and removes patterns that commonly cause hallucinations:
- Low-frequency rumble (AC noise, room tone)
- Repetitive patterns (fan noise, breathing)
- Gradual energy decay (reverb tails)

### Configuration Parameters

| Parameter | Normal | Aggressive | Paranoid |
|-----------|--------|------------|----------|
| `trim_window_size` | 480 samples (30ms) | 240 samples (15ms) | 160 samples (10ms) |
| `silence_window_duration` | 500ms | 200ms | 100ms |
| `end_speech_threshold` | 0.6 | 0.65 | 0.7 |
| `min_energy_ratio` | 0.1 | 0.15 | 0.2 |
| `energy_cliff_threshold` | 0.2 | 0.2 | 0.15 |

### Best Practices

1. **Aggressive mode is now the default** - provides good balance for most applications
2. **Use Normal mode** if you need less aggressive trimming and are confident about audio quality
3. **Use Paranoid mode** for:
   - Short commands or queries
   - Scenarios where missing a word is better than hallucinations
   - Audio from low-quality sources
4. **Monitor confidence decay** with Silero's `analyze_confidence_decay()` method
5. **Test with your specific audio** - different microphones and environments may need tuning

### Example: Custom Configuration

```rust
let config = ChunkConfig {
    max_duration: Duration::from_secs(30),
    min_buffer_duration: Duration::from_secs(6),
    silence_window_duration: Duration::from_millis(300),
    trim_window_size: 320, // Custom 20ms windows
    hallucination_prevention: HallucinationPreventionLevel::Aggressive,
    end_speech_threshold: 0.68, // Custom threshold
    min_energy_ratio: 0.12,
    energy_cliff_threshold: 0.25,
};
```