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
use std::sync::{Mutex, MutexGuard, PoisonError};

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

/// Helper function to handle mutex lock errors with logging
fn handle_mutex_lock<'a, T>(
    result: Result<MutexGuard<'a, T>, PoisonError<MutexGuard<'a, T>>>,
    context: &str,
) -> MutexGuard<'a, T> {
    result.unwrap_or_else(|e| {
        tracing::error!("{} mutex poisoned, attempting recovery: {}", context, e);
        e.into_inner()
    })
}

// Constants for confidence analysis
const CONFIDENCE_DECAY_WINDOW: usize = 5;
const LOW_CONFIDENCE_THRESHOLD: f32 = 0.3;
const RAPID_DECAY_COUNT_THRESHOLD: usize = 7;
const RAPID_DECAY_DROP_THRESHOLD: f32 = 0.3;
const SUSTAINED_LOW_THRESHOLD: f32 = 0.2;
const ACTIVE_CONFIDENCE_THRESHOLD: f32 = 0.5;

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
        let frames = *handle_mutex_lock(self.frames_since_speech.lock(), "frames_since_speech");
        // Reset after ~3 seconds of no speech (assuming 30ms chunks)
        if frames > 100 {
            handle_mutex_lock(self.inner.lock(), "VAD").reset();
            handle_mutex_lock(self.confidence_history.lock(), "confidence_history").clear();
            *handle_mutex_lock(self.frames_since_speech.lock(), "frames_since_speech") = 0;
        }
    }

    /// Calculate adaptive threshold based on recent confidence history
    fn calculate_adaptive_threshold(&self) -> f32 {
        let history = handle_mutex_lock(self.confidence_history.lock(), "confidence_history");
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
        let history = handle_mutex_lock(self.confidence_history.lock(), "confidence_history");

        if history.len() < CONFIDENCE_DECAY_WINDOW {
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
        let all_low = recent.iter().all(|&p| p < LOW_CONFIDENCE_THRESHOLD);
        let avg_recent = recent.iter().sum::<f32>() / recent.len() as f32;

        // Determine profile
        if decay_count >= RAPID_DECAY_COUNT_THRESHOLD && total_drop > RAPID_DECAY_DROP_THRESHOLD {
            ConfidenceProfile::RapidDecay
        } else if all_low && avg_recent < SUSTAINED_LOW_THRESHOLD {
            ConfidenceProfile::SustainedLow
        } else if avg_recent > ACTIVE_CONFIDENCE_THRESHOLD {
            ConfidenceProfile::Active
        } else {
            ConfidenceProfile::Unknown
        }
    }

    /// Get the average confidence over the last N predictions
    pub fn get_recent_confidence_avg(&self, n: usize) -> Option<f32> {
        let history = handle_mutex_lock(self.confidence_history.lock(), "confidence_history");

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
            let mut inner = handle_mutex_lock(self.inner.lock(), "VAD");
            inner.run(samples)?
        }; // Lock is automatically dropped here

        // Update confidence history
        {
            let mut history =
                handle_mutex_lock(self.confidence_history.lock(), "confidence_history");
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
            *handle_mutex_lock(self.frames_since_speech.lock(), "frames_since_speech") = 0;
        } else {
            *handle_mutex_lock(self.frames_since_speech.lock(), "frames_since_speech") += 1;
        }

        Ok(is_speech)
    }
}

// Constants for multi-feature fusion
const VAD_WEIGHT: f32 = 0.4;
const SPEECH_QUALITY_WEIGHT: f32 = 0.3;
const SNR_WEIGHT: f32 = 0.2;
const ONSET_BOOST: f32 = 0.2;
const HYSTERESIS_CURRENT_WEIGHT: f32 = 0.7;
const HYSTERESIS_PREVIOUS_WEIGHT: f32 = 0.3;

// Thresholds for different contexts
const ACTIVE_THRESHOLD: f32 = 0.4;
const NOISY_THRESHOLD: f32 = 0.6;
const DEFAULT_THRESHOLD: f32 = 0.5;
const NOISY_CONDITION_SNR_THRESHOLD: f32 = 2.0;

/// Enhanced predictor that combines multiple features for smarter decisions
pub struct SmartPredictor {
    silero: Silero,
    /// Noise floor estimation
    noise_floor: Mutex<f32>,
    /// Background noise profile (frequency bins)
    noise_profile: Mutex<Vec<f32>>,
    /// Onset detector for speech boundaries
    onset_detector: Mutex<crate::audio_analysis::OnsetDetector>,
    /// Track sample rate for spectral analysis
    sample_rate: u32,
    /// Cached spectrum analyzer for performance
    spectrum_analyzer: Mutex<crate::audio_analysis::SpectrumAnalyzer>,
    /// Feature extraction config
    feature_config: crate::audio_analysis::FeatureExtractionConfig,
}

impl SmartPredictor {
    pub fn new(sample_rate: u32) -> Result<Self, crate::Error> {
        Self::with_config(
            sample_rate,
            crate::audio_analysis::FeatureExtractionConfig::default(),
        )
    }

    pub fn new_realtime(sample_rate: u32) -> Result<Self, crate::Error> {
        Self::with_config(
            sample_rate,
            crate::audio_analysis::FeatureExtractionConfig::minimal(),
        )
    }

    pub fn with_config(
        sample_rate: u32,
        feature_config: crate::audio_analysis::FeatureExtractionConfig,
    ) -> Result<Self, crate::Error> {
        Ok(Self {
            silero: Silero::new()?,
            noise_floor: Mutex::new(0.01),
            noise_profile: Mutex::new(vec![0.0; 257]), // 512 FFT -> 257 bins
            onset_detector: Mutex::new(crate::audio_analysis::OnsetDetector::new(257)),
            sample_rate,
            spectrum_analyzer: Mutex::new(crate::audio_analysis::SpectrumAnalyzer::new()),
            feature_config,
        })
    }

    /// Update noise profile during silence
    fn update_noise_profile(&self, samples: &[f32]) {
        // Use cached spectrum analyzer
        let mut analyzer = handle_mutex_lock(self.spectrum_analyzer.lock(), "spectrum_analyzer");
        let spectrum = analyzer.compute_magnitude_spectrum(samples);

        // Update noise profile with exponential moving average
        let mut noise_profile = handle_mutex_lock(self.noise_profile.lock(), "noise_profile");
        if noise_profile.len() == spectrum.len() {
            for (profile, &spec) in noise_profile.iter_mut().zip(spectrum.iter()) {
                *profile = *profile * 0.95 + spec * 0.05;
            }
        } else {
            // Resize if needed
            *noise_profile = spectrum;
        }

        let rms = crate::audio_analysis::calculate_rms(samples);

        // Update noise floor with exponential moving average
        let mut noise_floor = handle_mutex_lock(self.noise_floor.lock(), "noise_floor");
        *noise_floor = *noise_floor * 0.95 + rms * 0.05;

        // Adapt onset detector threshold
        let mut onset_detector = handle_mutex_lock(self.onset_detector.lock(), "onset_detector");
        onset_detector.adapt_threshold(*noise_floor);
    }

    /// Multi-feature fusion for speech detection
    fn fuse_features(&self, samples: &[f32]) -> (bool, f32) {
        // Get VAD speech likelihood (probability that audio contains speech)
        // This is the raw probability from the VAD, not affected by the threshold decision
        let speech_likelihood = self.silero.get_recent_confidence_avg(1).unwrap_or_else(|| {
            // Fallback: try to get fresh prediction if no history
            if let Ok(_) = self.silero.predict(samples) {
                self.silero.get_recent_confidence_avg(1).unwrap_or(0.5)
            } else {
                0.5 // Neutral if VAD fails
            }
        });

        // Get spectral features using selective extraction
        let features = crate::audio_analysis::calculate_spectral_features_selective(
            samples,
            self.sample_rate,
            self.feature_config,
        );

        // Calculate speech quality from features
        let speech_quality = Self::calculate_speech_quality_from_features(&features);

        // Check for onset
        let is_onset =
            handle_mutex_lock(self.onset_detector.lock(), "onset_detector").detect_onset(samples);

        // Energy analysis
        let rms = crate::audio_analysis::calculate_rms(samples);
        let noise_floor = *handle_mutex_lock(self.noise_floor.lock(), "noise_floor");
        let snr = if noise_floor > 0.0 {
            rms / noise_floor
        } else {
            10.0
        };

        // Weighted feature fusion
        let mut confidence = 0.0;
        confidence += speech_likelihood * VAD_WEIGHT; // VAD is primary
        confidence += speech_quality * SPEECH_QUALITY_WEIGHT; // Spectral quality
        confidence += (snr.min(10.0) / 10.0) * SNR_WEIGHT; // SNR contribution

        // Boost confidence if onset detected
        if is_onset {
            confidence = (confidence + ONSET_BOOST).min(1.0);
        }

        // Hysteresis for temporal stability
        let prev_confidence = self.silero.get_recent_confidence_avg(3).unwrap_or(0.5);
        confidence =
            confidence * HYSTERESIS_CURRENT_WEIGHT + prev_confidence * HYSTERESIS_PREVIOUS_WEIGHT;

        // Dynamic threshold based on context
        let threshold =
            if self.silero.analyze_confidence_decay() == crate::ConfidenceProfile::Active {
                ACTIVE_THRESHOLD // Lower threshold during active speech
            } else if snr < NOISY_CONDITION_SNR_THRESHOLD {
                NOISY_THRESHOLD // Higher threshold in noisy conditions
            } else {
                DEFAULT_THRESHOLD
            };

        (confidence > threshold, confidence)
    }

    /// Calculate speech quality from spectral features
    ///
    /// These thresholds are based on fundamental properties of human speech that remain
    /// consistent across languages, speakers, and recording conditions:
    /// - Human vocal tract physics constrains formant frequencies
    /// - Speech production mechanisms are anatomically limited
    /// - These ranges are well-established in speech processing literature
    ///
    /// Making these configurable would add complexity without benefit, as deviating from
    /// these ranges would likely indicate non-speech audio rather than edge cases.
    pub fn calculate_speech_quality_from_features(
        features: &crate::audio_analysis::SpectralFeatures,
    ) -> f32 {
        let mut quality = 0.0;

        // Speech typically has centroid between 300-3000 Hz
        // Below 300 Hz: likely environmental noise or rumble
        // Above 3000 Hz: likely high-frequency noise or non-speech
        if features.spectral_centroid > 300.0 && features.spectral_centroid < 3000.0 {
            quality += 0.3;
        }

        // Good speech has moderate spread (200-2000 Hz)
        // Low spread: tonal sounds (not speech)
        // High spread: white noise or broadband noise
        if features.spectral_spread > 200.0 && features.spectral_spread < 2000.0 {
            quality += 0.2;
        }

        // Pitched speech has harmonicity > 0.3
        // This indicates periodic vocal fold vibration characteristic of voiced speech
        if features.harmonicity > 0.3 {
            quality += 0.3;
        }

        // Speech rolloff typically around 4-8 kHz
        // Most speech energy is below 4 kHz, with natural rolloff
        // Rolloff > 8 kHz suggests high-frequency noise
        if features.spectral_rolloff > 4000.0 && features.spectral_rolloff < 8000.0 {
            quality += 0.2;
        }

        quality
    }
}

impl Predictor for SmartPredictor {
    fn predict(&self, samples: &[f32]) -> Result<bool, crate::Error> {
        let (is_speech, confidence) = self.fuse_features(samples);

        // Update noise profile during silence
        // The 0.3 threshold is intentionally conservative: we only update noise profile
        // when we're >70% confident it's NOT speech. This prevents contaminating the
        // noise profile with speech, which would degrade future detection accuracy.
        // A more permissive threshold risks learning speech as noise, while a stricter
        // threshold might never update in moderately noisy environments.
        if !is_speech && confidence < 0.3 {
            self.update_noise_profile(samples);
        }

        Ok(is_speech)
    }
}
