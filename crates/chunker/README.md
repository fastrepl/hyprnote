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

## Smart Features (Advanced)

The chunker now includes advanced smart features for even better speech detection and boundary precision:

### SmartPredictor

An enhanced predictor that combines multiple analysis techniques:

```rust
use chunker::SmartPredictor;

// Create a smart predictor with sample rate
let predictor = SmartPredictor::new(16000)?;
let chunked = audio_source.chunks(predictor, Duration::from_secs(30));
```

Features:
- **Multi-feature fusion**: Combines VAD, spectral analysis, and energy metrics
- **Adaptive noise floor**: Tracks and adapts to background noise
- **Onset detection**: Identifies speech boundaries using spectral flux
- **Dynamic thresholds**: Adjusts sensitivity based on SNR and context
- **Temporal smoothing**: Reduces false positives with hysteresis

### Spectral Analysis

The chunker can now analyze spectral features for better speech/noise discrimination:

- **Spectral centroid**: Brightness indicator (300-3000 Hz for speech)
- **Spectral spread**: Timbral width measurement
- **Pitch detection**: Autocorrelation-based fundamental frequency tracking
- **Harmonicity**: Ratio of harmonic to total energy
- **Speech quality scoring**: Combined metric for speech likelihood

### Context-Aware Processing

The stream processor now tracks context across chunks:

- **Conversation detection**: Identifies rapid exchanges for lower latency
- **Quality adaptation**: Adjusts thresholds based on audio quality
- **Pitch continuity**: Avoids cutting mid-word using pitch tracking
- **Dynamic configuration**: Auto-adjusts parameters based on context

### Enhanced Boundary Detection

Smart trimming features for natural speech boundaries:

1. **Pitch discontinuity detection**: Extends boundaries if pitch changes dramatically
2. **Onset preservation**: Ensures speech onsets aren't cut
3. **Quality-aware extension**: Extends high-quality speech segments
4. **Voiced/unvoiced fade**: Different fade durations based on segment type

### Usage Example with Smart Features

```rust
use chunker::{ChunkerExt, SmartPredictor, ChunkConfig};
use std::time::Duration;

// Create smart predictor
let predictor = SmartPredictor::new(16000)?;

// Use with custom config
let config = ChunkConfig::default()
    .with_hallucination_prevention(HallucinationPreventionLevel::Aggressive);

let chunked = audio_source.chunks_with_config(predictor, config);

// The chunker will now:
// - Adapt to background noise levels
// - Detect conversation patterns
// - Preserve natural speech boundaries
// - Minimize Whisper hallucinations
// - Provide consistent quality across varying conditions
```

### Performance Optimizations (Implemented)

The chunker now includes several performance optimizations:

#### 1. **FFT-based Spectral Analysis**
- Replaced O(n²) DFT with efficient FFT using `rustfft`
- Cached FFT planner for repeated transforms
- Windowing function (Hann) for better spectral characteristics

#### 2. **Selective Feature Extraction**
```rust
// Minimal config for real-time processing
let predictor = SmartPredictor::new_realtime(16000)?;

// Custom feature selection
let config = FeatureExtractionConfig {
    compute_spectral: true,  // Essential features only
    compute_pitch: false,    // Skip expensive pitch detection
    compute_harmonicity: false,
    fft_size: Some(512),    // Fixed small FFT for consistency
};
```

#### 3. **SIMD-Friendly Correlation**
- Unrolled loops for better vectorization
- Chunk-based processing for CPU cache efficiency
- Optimized memory access patterns

#### 4. **Caching and Reuse**
- Spectrum analyzer caching per stream
- FFT plan caching for repeated transforms
- Noise profile adaptive learning

#### 5. **Real-time Configurations**
```rust
// Real-time predictor with minimal features
let predictor = SmartPredictor::new_realtime(sample_rate)?;

// Standard chunker with optimized defaults
let config = ChunkConfig::default(); // Already optimized for real-time
```

### Performance Benchmarks

Typical performance improvements (compared to naive implementation):
- FFT vs DFT: ~10-100x faster for typical window sizes
- Selective features: ~2-3x faster when skipping pitch/harmonicity
- SIMD correlation: ~2-4x faster on modern CPUs
- Overall: ~5-20x improvement for real-time processing

### Memory Usage

The optimized implementation uses:
- ~4KB for FFT planner cache
- ~2KB for spectrum analyzer state
- ~1KB for noise profile
- Minimal allocations during streaming