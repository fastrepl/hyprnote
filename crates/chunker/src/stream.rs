use futures_util::Stream;
use std::{
    pin::Pin,
    task::{Context, Poll},
    time::Duration,
};

use kalosm_sound::AsyncSource;
use rodio::buffer::SamplesBuffer;

use crate::{audio_analysis::*, Predictor};
use std::collections::VecDeque;

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

/// Default consecutive silence windows threshold for end trimming
const DEFAULT_SILENCE_WINDOW_THRESHOLD: usize = 10;

/// Context for cross-chunk state tracking
#[derive(Debug)]
struct ChunkContext {
    /// Recent chunk durations for adaptation
    recent_durations: VecDeque<Duration>,
    /// Average speech energy across chunks
    avg_speech_energy: f32,
    /// Quality metrics from previous chunks
    quality_history: VecDeque<f32>,
    /// Track if we're in a conversation
    conversation_mode: bool,
    /// Last detected pitch for continuity
    last_pitch: Option<f32>,
}

impl Default for ChunkContext {
    fn default() -> Self {
        Self {
            recent_durations: VecDeque::with_capacity(10),
            avg_speech_energy: 0.0,
            quality_history: VecDeque::with_capacity(10),
            conversation_mode: false,
            last_pitch: None,
        }
    }
}

impl ChunkContext {
    fn update(&mut self, duration: Duration, energy: f32, quality: f32, pitch: Option<f32>) {
        // Update duration history
        self.recent_durations.push_back(duration);
        if self.recent_durations.len() > 10 {
            self.recent_durations.pop_front();
        }

        // Update average energy with EMA
        self.avg_speech_energy = self.avg_speech_energy * 0.9 + energy * 0.1;

        // Update quality history
        self.quality_history.push_back(quality);
        if self.quality_history.len() > 10 {
            self.quality_history.pop_front();
        }

        // Detect conversation mode (rapid exchanges)
        if self.recent_durations.len() >= 3 {
            let recent_avg = self
                .recent_durations
                .iter()
                .rev()
                .take(3)
                .map(|d| d.as_secs_f32())
                .sum::<f32>()
                / 3.0;
            self.conversation_mode = recent_avg < 5.0; // Short utterances
        }

        // Track pitch continuity
        self.last_pitch = pitch;
    }

    fn suggest_config_adjustment(&self, current_config: &ChunkConfig) -> ChunkConfig {
        let mut config = current_config.clone();

        // In conversation mode, be more aggressive to reduce latency
        if self.conversation_mode {
            config.silence_window_duration = Duration::from_millis(150);
            config.min_buffer_duration = Duration::from_secs(3);
        }

        // If quality has been consistently low, relax thresholds
        if self.quality_history.len() >= 5 {
            let avg_quality =
                self.quality_history.iter().sum::<f32>() / self.quality_history.len() as f32;
            if avg_quality < 0.3 {
                config.min_energy_ratio *= 0.8;
                config.end_speech_threshold *= 0.9;
            }
        }

        config
    }
}

pub struct ChunkStream<S: AsyncSource + Unpin, P: Predictor + Unpin> {
    source: S,
    predictor: P,
    buffer: Vec<f32>,
    config: ChunkConfig,
    /// Look-ahead buffer for better boundary decisions
    lookahead_buffer: Vec<f32>,
    /// Context tracking across chunks
    context: ChunkContext,
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
            lookahead_buffer: Vec::new(),
            context: ChunkContext::default(),
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
                        DEFAULT_SILENCE_WINDOW_THRESHOLD // ~300ms normally
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

    /// Enhanced trimming using spectral features and pitch tracking
    fn smart_trim_with_spectral_features(
        predictor: &P,
        config: &ChunkConfig,
        data: &mut Vec<f32>,
        sample_rate: u32,
        context: &ChunkContext,
    ) {
        if data.is_empty() || data.len() < 1024 {
            return;
        }

        // Stage 1: Standard trimming
        let (trim_start, mut trim_end) = Self::standard_vad_trim(predictor, config, data);

        // Stage 2: Spectral-based boundary refinement
        if trim_end > trim_start + 1024 {
            // Analyze the boundary region
            let boundary_start = trim_end.saturating_sub(1600); // 100ms before end
            let boundary_data = &data[boundary_start..trim_end];

            // Look for pitch discontinuity
            if let Some(last_pitch) = context.last_pitch {
                let current_pitch = detect_pitch_autocorrelation(boundary_data, sample_rate);
                if let Some(pitch) = current_pitch {
                    // If pitch changes dramatically, might be cutting mid-word
                    if (pitch - last_pitch).abs() / last_pitch > 0.3 {
                        // Extend boundary by 50ms
                        trim_end = (trim_end + 800).min(data.len());
                    }
                }
            }

            // Check for speech onset in the boundary
            let mut onset_detector = OnsetDetector::new(257);
            let mut found_onset = false;
            for i in (boundary_start..trim_end).step_by(160) {
                let end = (i + 512).min(data.len());
                if onset_detector.detect_onset(&data[i..end]) {
                    found_onset = true;
                    trim_end = end + 160; // Keep 10ms after onset
                    break;
                }
            }

            // If we're cutting during high speech quality, extend
            if !found_onset && trim_end > 2048 {
                let quality_check_start = trim_end.saturating_sub(2048);
                let quality =
                    analyze_speech_quality(&data[quality_check_start..trim_end], sample_rate);
                if quality > 0.7 {
                    // High quality speech, extend by 30ms
                    trim_end = (trim_end + 480).min(data.len());
                }
            }
        }

        // Apply trimming
        if trim_end > trim_start {
            data.drain(..trim_start);
            data.truncate(trim_end - trim_start);
        } else {
            data.clear();
            return;
        }

        // Continue with energy-based and hallucination prevention stages
        if config.hallucination_prevention != HallucinationPreventionLevel::Normal {
            Self::energy_based_trim(config, data);
        }

        if config.hallucination_prevention == HallucinationPreventionLevel::Paranoid {
            Self::remove_hallucination_triggers(config, data);
        }

        // Apply fade with spectral awareness
        if !data.is_empty() {
            // Check if we're ending on a voiced segment
            let last_segment = &data[data.len().saturating_sub(512)..];
            let pitch = detect_pitch_autocorrelation(last_segment, sample_rate);

            // Longer fade for voiced segments
            let fade_samples = if pitch.is_some() {
                240.min(data.len()) // 15ms for voiced
            } else {
                160.min(data.len()) // 10ms for unvoiced
            };

            apply_fade_out(data, fade_samples);
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

                            // Use smart trimming if we have enough data
                            if data.len() > 2048 {
                                Self::smart_trim_with_spectral_features(
                                    &this.predictor,
                                    &this.config,
                                    &mut data,
                                    sample_rate,
                                    &this.context,
                                );
                            } else {
                                Self::trim_silence(&this.predictor, &this.config, &mut data);
                            }

                            // Skip empty chunks to prevent Whisper hallucinations
                            if !data.is_empty() {
                                // Update context with chunk metrics
                                let duration =
                                    Duration::from_secs_f32(data.len() as f32 / sample_rate as f32);
                                let energy = calculate_peak_rms(&data, 480);
                                let quality = analyze_speech_quality(&data, sample_rate);
                                let pitch = detect_pitch_autocorrelation(&data, sample_rate);

                                this.context.update(duration, energy, quality, pitch);

                                // Adapt config based on context
                                this.config = this.context.suggest_config_adjustment(&this.config);

                                return Poll::Ready(Some(SamplesBuffer::new(1, sample_rate, data)));
                            }
                        }
                    }
                }
                Poll::Ready(None) if !this.buffer.is_empty() => {
                    let mut data = std::mem::take(&mut this.buffer);

                    // Use smart trimming for final chunk
                    if data.len() > 2048 {
                        Self::smart_trim_with_spectral_features(
                            &this.predictor,
                            &this.config,
                            &mut data,
                            sample_rate,
                            &this.context,
                        );
                    } else {
                        Self::trim_silence(&this.predictor, &this.config, &mut data);
                    }

                    // Skip empty chunks to prevent Whisper hallucinations
                    if !data.is_empty() {
                        // Update context
                        let duration =
                            Duration::from_secs_f32(data.len() as f32 / sample_rate as f32);
                        let energy = calculate_peak_rms(&data, 480);
                        let quality = analyze_speech_quality(&data, sample_rate);
                        let pitch = detect_pitch_autocorrelation(&data, sample_rate);
                        this.context.update(duration, energy, quality, pitch);

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

        // Use smart trimming for max-duration chunks
        if chunk.len() > 2048 {
            Self::smart_trim_with_spectral_features(
                &this.predictor,
                &this.config,
                &mut chunk,
                sample_rate,
                &this.context,
            );
        } else {
            Self::trim_silence(&this.predictor, &this.config, &mut chunk);
        }

        // Skip empty chunks to prevent Whisper hallucinations
        if !chunk.is_empty() {
            // Update context
            let duration = Duration::from_secs_f32(chunk.len() as f32 / sample_rate as f32);
            let energy = calculate_peak_rms(&chunk, 480);
            let quality = analyze_speech_quality(&chunk, sample_rate);
            let pitch = detect_pitch_autocorrelation(&chunk, sample_rate);
            this.context.update(duration, energy, quality, pitch);

            Poll::Ready(Some(SamplesBuffer::new(1, sample_rate, chunk)))
        } else {
            // Buffer was full but trimmed to empty - this means we had a long silence
            // Don't wake immediately to avoid busy loop; let more data accumulate
            Poll::Pending
        }
    }
}
