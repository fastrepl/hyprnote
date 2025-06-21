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
            high_confidence_speech_threshold: 0.4,
            low_confidence_speech_threshold: 0.6,
        }
    }
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
        let frames = *self.frames_since_speech.lock().unwrap();
        // Reset after ~3 seconds of no speech (assuming 30ms chunks)
        if frames > 100 {
            self.inner.lock().unwrap().reset();
            self.confidence_history.lock().unwrap().clear();
            *self.frames_since_speech.lock().unwrap() = 0;
        }
    }

    /// Calculate adaptive threshold based on recent confidence history
    fn calculate_adaptive_threshold(&self) -> f32 {
        let history = self.confidence_history.lock().unwrap();
        if history.is_empty() {
            return self.config.base_threshold;
        }

        let avg_confidence: f32 = history.iter().sum::<f32>() / history.len() as f32;

        if avg_confidence > self.config.high_confidence_threshold {
            // In clear speech, lower threshold to catch soft speech
            self.config.high_confidence_speech_threshold
        } else {
            // In noisy conditions, raise threshold to avoid false positives
            self.config.low_confidence_speech_threshold
        }
    }
}

impl Predictor for Silero {
    fn predict(&self, samples: &[f32]) -> Result<bool, crate::Error> {
        // Check for state reset conditions
        self.maybe_reset_state();

        // Run VAD prediction
        let probability = self.inner.lock().unwrap().run(samples)?;

        // Update confidence history
        {
            let mut history = self.confidence_history.lock().unwrap();
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
            *self.frames_since_speech.lock().unwrap() = 0;
        } else {
            *self.frames_since_speech.lock().unwrap() += 1;
        }

        Ok(is_speech)
    }
}
