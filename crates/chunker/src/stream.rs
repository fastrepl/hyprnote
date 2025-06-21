use futures_util::Stream;
use std::{
    pin::Pin,
    task::{Context, Poll},
    time::Duration,
};

use kalosm_sound::AsyncSource;
use rodio::buffer::SamplesBuffer;

use crate::{audio_analysis::*, Predictor};

/// Level of aggressiveness for hallucination prevention
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum HallucinationPreventionLevel {
    /// Standard trimming behavior
    Normal,
    /// Enhanced trimming with stricter thresholds
    Aggressive,
    /// Maximum trimming, may cut legitimate trailing words
    Paranoid,
}

/// Configuration for chunking behavior
#[derive(Debug, Clone)]
pub struct ChunkConfig {
    /// Maximum duration for a single chunk
    pub max_duration: Duration,
    /// Minimum buffer duration before considering silence splits
    pub min_buffer_duration: Duration,
    /// Duration of silence to trigger chunk split
    pub silence_window_duration: Duration,
    /// Window size for silence trimming (in samples)
    pub trim_window_size: usize,
    /// Hallucination prevention level
    pub hallucination_prevention: HallucinationPreventionLevel,
    /// Threshold for detecting end of speech in final seconds
    pub end_speech_threshold: f32,
    /// Minimum energy ratio for valid speech
    pub min_energy_ratio: f32,
    /// Energy drop threshold for cliff detection
    pub energy_cliff_threshold: f32,
}

impl Default for ChunkConfig {
    fn default() -> Self {
        // Default to Aggressive mode to prevent Whisper hallucinations
        Self {
            max_duration: Duration::from_secs(30), // Increased from 15s to 30s for Whisper
            min_buffer_duration: Duration::from_secs(6),
            silence_window_duration: Duration::from_millis(200), // Aggressive: 200ms
            trim_window_size: 240, // Aggressive: 15ms for finer control
            hallucination_prevention: HallucinationPreventionLevel::Aggressive,
            end_speech_threshold: 0.65, // Aggressive threshold
            min_energy_ratio: 0.15,     // Aggressive: higher energy requirement
            energy_cliff_threshold: 0.2,
        }
    }
}

impl ChunkConfig {
    /// Create configuration with specified hallucination prevention level
    pub fn with_hallucination_prevention(mut self, level: HallucinationPreventionLevel) -> Self {
        self.hallucination_prevention = level;

        match level {
            HallucinationPreventionLevel::Normal => {
                // Restore normal values
                self.silence_window_duration = Duration::from_millis(500);
                self.trim_window_size = 480; // 30ms at 16kHz
                self.end_speech_threshold = 0.6;
                self.min_energy_ratio = 0.1;
            }
            HallucinationPreventionLevel::Aggressive => {
                self.trim_window_size = 240; // 15ms for finer control
                self.silence_window_duration = Duration::from_millis(200);
                self.end_speech_threshold = 0.65;
                self.min_energy_ratio = 0.15;
            }
            HallucinationPreventionLevel::Paranoid => {
                self.trim_window_size = 160; // 10ms windows
                self.silence_window_duration = Duration::from_millis(100);
                self.end_speech_threshold = 0.7;
                self.min_energy_ratio = 0.2;
                self.energy_cliff_threshold = 0.15;
            }
        }

        self
    }
}

pub struct ChunkStream<S: AsyncSource + Unpin, P: Predictor + Unpin> {
    source: S,
    predictor: P,
    buffer: Vec<f32>,
    config: ChunkConfig,
}

impl<S: AsyncSource + Unpin, P: Predictor + Unpin> ChunkStream<S, P> {
    pub fn new(source: S, predictor: P, max_duration: Duration) -> Self {
        Self::with_config(
            source,
            predictor,
            ChunkConfig {
                max_duration,
                ..Default::default()
            },
        )
    }

    pub fn with_config(source: S, predictor: P, config: ChunkConfig) -> Self {
        Self {
            source,
            predictor,
            buffer: Vec::new(),
            config,
        }
    }

    fn max_samples(&self) -> usize {
        (self.source.sample_rate() as f64 * self.config.max_duration.as_secs_f64()) as usize
    }

    fn samples_for_duration(&self, duration: Duration) -> usize {
        (self.source.sample_rate() as f64 * duration.as_secs_f64()) as usize
    }

    fn trim_silence(predictor: &P, config: &ChunkConfig, data: &mut Vec<f32>) {
        // Stage 1: Standard VAD trimming
        let (trim_start, trim_end) = Self::standard_vad_trim(predictor, config, data);

        // Apply initial trimming
        if trim_end > trim_start {
            data.drain(..trim_start);
            data.truncate(trim_end - trim_start);
        } else {
            data.clear();
            return;
        }

        // Stage 2: Energy-based validation (only for aggressive modes)
        if config.hallucination_prevention != HallucinationPreventionLevel::Normal {
            Self::energy_based_trim(config, data);
        }

        // Stage 3: Hallucination trigger removal (only for paranoid mode)
        if config.hallucination_prevention == HallucinationPreventionLevel::Paranoid {
            Self::remove_hallucination_triggers(config, data);
        }

        // Stage 4: Apply fade-out
        if !data.is_empty() {
            let fade_samples = 160.min(data.len());
            apply_fade_out(data, fade_samples); // 10ms fade
        }
    }

    fn standard_vad_trim(predictor: &P, config: &ChunkConfig, data: &[f32]) -> (usize, usize) {
        let window_size = config.trim_window_size;

        // Trim from beginning
        let mut trim_start = 0;
        for start_idx in (0..data.len()).step_by(window_size) {
            let end_idx = (start_idx + window_size).min(data.len());
            let window = &data[start_idx..end_idx];

            if let Ok(true) = predictor.predict(window) {
                trim_start = start_idx;
                break;
            }
        }

        // Enhanced end trimming with position awareness
        let mut trim_end = data.len();
        let mut consecutive_silence_windows = 0;
        let mut pos = data.len();

        // Determine zones for different aggressiveness
        let danger_zone_start = data.len().saturating_sub(48000); // 3s at 16kHz
        let critical_zone_start = data.len().saturating_sub(16000); // 1s at 16kHz

        while pos > window_size {
            pos = pos.saturating_sub(window_size);
            let end_idx = (pos + window_size).min(data.len());
            let window = &data[pos..end_idx];

            match predictor.predict(window) {
                Ok(true) => {
                    // Found speech - calculate safety margin based on position
                    let safety_margin = if pos >= critical_zone_start {
                        window_size // Minimal margin in critical zone
                    } else if pos >= danger_zone_start {
                        window_size * 3 / 2 // 1.5x margin in danger zone
                    } else {
                        window_size * 2 // Normal 2x margin
                    };

                    trim_end = (end_idx + safety_margin).min(data.len());
                    break;
                }
                Ok(false) => {
                    consecutive_silence_windows += 1;

                    // More aggressive thresholds in danger zones
                    let silence_threshold = if pos >= critical_zone_start {
                        3 // ~90ms in critical zone
                    } else if pos >= danger_zone_start {
                        5 // ~150ms in danger zone
                    } else {
                        10 // ~300ms normally
                    };

                    if consecutive_silence_windows > silence_threshold {
                        trim_end = pos;
                    }
                }
                Err(_) => break,
            }
        }

        (trim_start, trim_end)
    }

    fn energy_based_trim(config: &ChunkConfig, data: &mut Vec<f32>) {
        if data.is_empty() {
            return;
        }

        let window_size = config.trim_window_size;
        let peak_energy = calculate_peak_rms(data, window_size);
        let energy_threshold = peak_energy * config.min_energy_ratio;

        // Scan from end with energy validation
        let mut trim_pos = data.len();
        let mut last_valid_pos = data.len();

        for pos in (0..data.len()).rev().step_by(window_size / 2) {
            let end = (pos + window_size).min(data.len());
            if pos >= end {
                continue;
            }

            let window_energy = calculate_rms(&data[pos..end]);

            // Check for energy cliff
            if pos + window_size < last_valid_pos {
                let next_window_end = (pos + window_size * 2).min(data.len());
                if pos + window_size < next_window_end {
                    let next_energy = calculate_rms(&data[pos + window_size..next_window_end]);

                    if window_energy > energy_threshold
                        && next_energy < window_energy * config.energy_cliff_threshold
                    {
                        // Found cliff - speech likely ends here
                        trim_pos = end + window_size;
                        break;
                    }
                }
            }

            if window_energy > energy_threshold {
                last_valid_pos = end;
            } else if last_valid_pos - pos > window_size * 10 {
                // Found 300ms+ of low energy
                trim_pos = pos;
                break;
            }
        }

        data.truncate(trim_pos);
    }

    fn remove_hallucination_triggers(_config: &ChunkConfig, data: &mut Vec<f32>) {
        if data.len() < 16000 {
            return; // Need at least 1 second
        }

        let last_second_start = data.len().saturating_sub(16000);
        let last_second = &data[last_second_start..];

        // Check for hallucination triggers
        let low_freq_ratio = calculate_low_freq_energy_ratio(last_second, 16000);
        let pattern_score = detect_repetitive_patterns(last_second, 480);
        let decay_profile = analyze_energy_decay(last_second, 480);

        // Decision logic
        let trigger_score = (low_freq_ratio * 0.3)
            + (pattern_score * 0.3)
            + (if decay_profile.is_gradual { 0.4 } else { 0.0 });

        if trigger_score > 0.5 {
            // High likelihood of triggering hallucination
            // Remove last 500ms aggressively
            let trim_to = data.len().saturating_sub(8000);
            data.truncate(trim_to);
        }
    }
}

impl<S: AsyncSource + Unpin, P: Predictor + Unpin> Stream for ChunkStream<S, P> {
    type Item = SamplesBuffer<f32>;

    fn poll_next(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        let this = self.get_mut();
        let max_samples = this.max_samples();
        let sample_rate = this.source.sample_rate();

        let min_buffer_samples = this.samples_for_duration(this.config.min_buffer_duration);
        let silence_window_samples = this.samples_for_duration(this.config.silence_window_duration);

        let stream = this.source.as_stream();
        let mut stream = std::pin::pin!(stream);

        while this.buffer.len() < max_samples {
            match stream.as_mut().poll_next(cx) {
                Poll::Ready(Some(sample)) => {
                    this.buffer.push(sample);

                    if this.buffer.len() >= min_buffer_samples {
                        let buffer_len = this.buffer.len();
                        let silence_start = buffer_len.saturating_sub(silence_window_samples);
                        let last_samples = &this.buffer[silence_start..buffer_len];

                        if let Ok(false) = this.predictor.predict(last_samples) {
                            let mut data = std::mem::take(&mut this.buffer);
                            Self::trim_silence(&this.predictor, &this.config, &mut data);

                            // Skip empty chunks to prevent Whisper hallucinations
                            if !data.is_empty() {
                                return Poll::Ready(Some(SamplesBuffer::new(1, sample_rate, data)));
                            }
                        }
                    }
                }
                Poll::Ready(None) if !this.buffer.is_empty() => {
                    let mut data = std::mem::take(&mut this.buffer);
                    Self::trim_silence(&this.predictor, &this.config, &mut data);

                    // Skip empty chunks to prevent Whisper hallucinations
                    if !data.is_empty() {
                        return Poll::Ready(Some(SamplesBuffer::new(1, sample_rate, data)));
                    } else {
                        return Poll::Ready(None);
                    }
                }
                Poll::Ready(None) => return Poll::Ready(None),
                Poll::Pending => return Poll::Pending,
            }
        }

        let mut chunk: Vec<_> = this.buffer.drain(0..max_samples).collect();
        Self::trim_silence(&this.predictor, &this.config, &mut chunk);

        // Skip empty chunks to prevent Whisper hallucinations
        if !chunk.is_empty() {
            Poll::Ready(Some(SamplesBuffer::new(1, sample_rate, chunk)))
        } else {
            // Buffer was full but trimmed to empty - this means we had a long silence
            // Don't wake immediately to avoid busy loop; let more data accumulate
            Poll::Pending
        }
    }
}
