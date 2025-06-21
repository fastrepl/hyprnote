pub trait Predictor: Send + Sync {
    fn predict(&self, samples: &[f32]) -> Result<bool, crate::Error>;
}

// Allow Box<dyn Predictor> to be used as a Predictor
impl<P: Predictor + ?Sized> Predictor for Box<P> {
    fn predict(&self, samples: &[f32]) -> Result<bool, crate::Error> {
        (**self).predict(samples)
    }
}

#[derive(Debug)]
pub struct RMS {}

impl RMS {
    pub fn new() -> Self {
        Self {}
    }
}

impl Default for RMS {
    fn default() -> Self {
        Self::new()
    }
}

impl Predictor for RMS {
    fn predict(&self, samples: &[f32]) -> Result<bool, crate::Error> {
        if samples.is_empty() {
            return Ok(false);
        }

        let sum_squares: f32 = samples.iter().map(|&sample| sample * sample).sum();
        let mean_square = sum_squares / samples.len() as f32;
        let rms = mean_square.sqrt();
        Ok(rms > 0.009)
    }
}

use std::collections::VecDeque;
use std::sync::Mutex;

/// Configuration for Silero VAD predictor
#[derive(Debug, Clone)]
pub struct SileroConfig {
    /// Base threshold for speech detection (0.0-1.0)
    pub base_threshold: f32,
    /// Size of confidence history window (in predictions)
    pub confidence_window_size: usize,
    /// Minimum average confidence to lower threshold
    pub high_confidence_threshold: f32,
    /// Threshold adjustment for high confidence speech
    pub high_confidence_speech_threshold: f32,
    /// Threshold adjustment for low confidence/noisy conditions
    pub low_confidence_speech_threshold: f32,
}

impl Default for SileroConfig {
    fn default() -> Self {
        Self {
            base_threshold: 0.5,
            confidence_window_size: 10,
            high_confidence_threshold: 0.7,
            high_confidence_speech_threshold: 0.35, // Lower to catch soft speech
            low_confidence_speech_threshold: 0.55,  // Slightly lower for better detection
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ConfidenceProfile {
    /// Unknown or insufficient data
    Unknown,
    /// Actively detecting speech
    Active,
    /// Rapid decay in confidence (likely end of speech)
    RapidDecay,
    /// Sustained low confidence (likely silence/noise)
    SustainedLow,
}

pub struct Silero {
    inner: Mutex<hypr_vad::Vad>,
    config: SileroConfig,
    confidence_history: Mutex<VecDeque<f32>>,
    /// Track if we should reset VAD state (e.g., after long silence)
    frames_since_speech: Mutex<usize>,
}

impl Silero {
    pub fn new() -> Result<Self, crate::Error> {
        Self::with_config(SileroConfig::default())
    }

    pub fn with_config(config: SileroConfig) -> Result<Self, crate::Error> {
        Ok(Self {
            inner: Mutex::new(hypr_vad::Vad::new()?),
            config,
            confidence_history: Mutex::new(VecDeque::with_capacity(10)),
            frames_since_speech: Mutex::new(0),
        })
    }

    /// Reset VAD state after extended silence
    fn maybe_reset_state(&self) {
        let frames = *self.frames_since_speech.lock().unwrap_or_else(|e| {
            tracing::error!(
                "Frames since speech mutex poisoned, attempting recovery: {}",
                e
            );
            e.into_inner()
        });
        // Reset after ~3 seconds of no speech (assuming 30ms chunks)
        if frames > 100 {
            self.inner
                .lock()
                .unwrap_or_else(|e| {
                    tracing::error!("VAD mutex poisoned, attempting recovery: {}", e);
                    e.into_inner()
                })
                .reset();
            self.confidence_history
                .lock()
                .unwrap_or_else(|e| {
                    tracing::error!(
                        "Confidence history mutex poisoned, attempting recovery: {}",
                        e
                    );
                    e.into_inner()
                })
                .clear();
            *self.frames_since_speech.lock().unwrap_or_else(|e| {
                tracing::error!(
                    "Frames since speech mutex poisoned, attempting recovery: {}",
                    e
                );
                e.into_inner()
            }) = 0;
        }
    }

    /// Calculate adaptive threshold based on recent confidence history
    fn calculate_adaptive_threshold(&self) -> f32 {
        let history = self.confidence_history.lock().unwrap_or_else(|e| {
            tracing::error!(
                "Confidence history mutex poisoned, attempting recovery: {}",
                e
            );
            e.into_inner()
        });
        if history.is_empty() {
            return self.config.base_threshold;
        }

        let avg_confidence: f32 = history.iter().sum::<f32>() / history.len() as f32;

        if avg_confidence > self.config.high_confidence_threshold {
            // In clear speech, lower threshold to catch soft speech
            self.config.high_confidence_speech_threshold
        } else if avg_confidence < 0.1 {
            // In very low confidence (likely silence), use base threshold
            self.config.base_threshold
        } else {
            // In noisy conditions, raise threshold to avoid false positives
            self.config.low_confidence_speech_threshold
        }
    }

    /// Analyze confidence decay pattern for end-of-speech detection
    pub fn analyze_confidence_decay(&self) -> ConfidenceProfile {
        let history = self.confidence_history.lock().unwrap_or_else(|e| {
            tracing::error!(
                "Confidence history mutex poisoned, attempting recovery: {}",
                e
            );
            e.into_inner()
        });

        if history.len() < 5 {
            return ConfidenceProfile::Unknown;
        }

        // Get recent values (newest first)
        let recent: Vec<f32> = history.iter().rev().take(10).copied().collect();

        // Calculate decay metrics
        let mut decay_count = 0;
        let mut total_drop = 0.0;

        for i in 1..recent.len().min(10) {
            if recent[i] < recent[i - 1] * 0.9 {
                decay_count += 1;
                total_drop += recent[i - 1] - recent[i];
            }
        }

        // Check if all recent values are low
        let all_low = recent.iter().all(|&p| p < 0.3);
        let avg_recent = recent.iter().sum::<f32>() / recent.len() as f32;

        // Determine profile
        if decay_count >= 7 && total_drop > 0.3 {
            ConfidenceProfile::RapidDecay
        } else if all_low && avg_recent < 0.2 {
            ConfidenceProfile::SustainedLow
        } else if avg_recent > 0.5 {
            ConfidenceProfile::Active
        } else {
            ConfidenceProfile::Unknown
        }
    }

    /// Get the average confidence over the last N predictions
    pub fn get_recent_confidence_avg(&self, n: usize) -> Option<f32> {
        let history = self.confidence_history.lock().unwrap_or_else(|e| {
            tracing::error!(
                "Confidence history mutex poisoned, attempting recovery: {}",
                e
            );
            e.into_inner()
        });

        if history.is_empty() {
            return None;
        }

        let count = n.min(history.len());
        let sum: f32 = history.iter().rev().take(count).sum();
        Some(sum / count as f32)
    }
}

impl Predictor for Silero {
    fn predict(&self, samples: &[f32]) -> Result<bool, crate::Error> {
        // Silero VAD requires at least 30ms of audio (480 samples at 16kHz)
        const MIN_SAMPLES: usize = 480;

        // If we have too few samples, pad with zeros or return false
        if samples.len() < MIN_SAMPLES {
            // For very small chunks, assume it's not speech
            // This typically happens during silence trimming
            return Ok(false);
        }

        // Check for state reset conditions
        self.maybe_reset_state();

        // Run VAD prediction
        let probability = {
            let mut inner = self.inner.lock().unwrap_or_else(|e| {
                tracing::error!("VAD mutex poisoned, attempting recovery: {}", e);
                e.into_inner()
            });
            inner.run(samples)?
        }; // Lock is automatically dropped here

        // Update confidence history
        {
            let mut history = self.confidence_history.lock().unwrap_or_else(|e| {
                tracing::error!(
                    "Confidence history mutex poisoned, attempting recovery: {}",
                    e
                );
                e.into_inner()
            });
            history.push_back(probability);
            if history.len() > self.config.confidence_window_size {
                history.pop_front();
            }
        }

        // Calculate adaptive threshold
        let threshold = self.calculate_adaptive_threshold();

        // Make decision
        let is_speech = probability > threshold;

        // Update speech tracking
        if is_speech {
            *self.frames_since_speech.lock().unwrap_or_else(|e| {
                tracing::error!(
                    "Frames since speech mutex poisoned, attempting recovery: {}",
                    e
                );
                e.into_inner()
            }) = 0;
        } else {
            *self.frames_since_speech.lock().unwrap_or_else(|e| {
                tracing::error!(
                    "Frames since speech mutex poisoned, attempting recovery: {}",
                    e
                );
                e.into_inner()
            }) += 1;
        }

        Ok(is_speech)
    }
}
