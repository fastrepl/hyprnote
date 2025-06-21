//! Audio analysis utilities for energy-based silence detection and hallucination prevention

use rustfft::{num_complex::Complex, FftPlanner};
use std::f32::consts::PI;
use std::sync::Arc;

/// Calculate Root Mean Square (RMS) energy of audio samples
#[inline]
pub fn calculate_rms(samples: &[f32]) -> f32 {
    if samples.is_empty() {
        return 0.0;
    }

    let sum_squares: f32 = samples.iter().map(|&x| x * x).sum();
    (sum_squares / samples.len() as f32).sqrt()
}

/// Calculate peak RMS across sliding windows
pub fn calculate_peak_rms(samples: &[f32], window_size: usize) -> f32 {
    if samples.len() < window_size {
        return calculate_rms(samples);
    }

    let mut peak = 0.0f32;
    for i in 0..=(samples.len() - window_size) {
        let window_rms = calculate_rms(&samples[i..i + window_size]);
        peak = peak.max(window_rms);
    }

    peak
}

/// Analyze energy decay profile to detect gradual fade-outs
pub struct EnergyDecayProfile {
    pub is_gradual: bool,
    #[allow(dead_code)]
    pub decay_rate: f32,
    #[allow(dead_code)]
    pub final_energy_ratio: f32,
}

pub fn analyze_energy_decay(samples: &[f32], window_size: usize) -> EnergyDecayProfile {
    if samples.len() < window_size * 4 {
        return EnergyDecayProfile {
            is_gradual: false,
            decay_rate: 0.0,
            final_energy_ratio: 1.0,
        };
    }

    // Calculate energy for 4 equal segments
    let segment_size = samples.len() / 4;
    let energies: Vec<f32> = (0..4)
        .map(|i| {
            let start = i * segment_size;
            let end = ((i + 1) * segment_size).min(samples.len());
            calculate_rms(&samples[start..end])
        })
        .collect();

    // Check if energy consistently decreases
    let mut is_decreasing = true;
    let mut total_decay = 0.0;

    for i in 1..4 {
        if energies[i] > energies[i - 1] * 1.1 {
            // Allow 10% variance
            is_decreasing = false;
        }
        if energies[i - 1] > 0.0 {
            total_decay += (energies[i - 1] - energies[i]) / energies[i - 1];
        }
    }

    let avg_decay_rate = total_decay / 3.0;
    let final_ratio = if energies[0] > 0.0 {
        energies[3] / energies[0]
    } else {
        1.0
    };

    EnergyDecayProfile {
        is_gradual: is_decreasing && avg_decay_rate > 0.2,
        decay_rate: avg_decay_rate,
        final_energy_ratio: final_ratio,
    }
}

/// Detect repetitive patterns in audio (e.g., fan noise, breathing)
pub fn detect_repetitive_patterns(samples: &[f32], pattern_window: usize) -> f32 {
    if samples.len() < pattern_window * 4 {
        return 0.0;
    }

    // Simple autocorrelation-based approach
    let mut pattern_score: f32 = 0.0;
    let test_offsets = vec![pattern_window, pattern_window * 2, pattern_window * 3];

    for offset in test_offsets {
        if offset >= samples.len() {
            continue;
        }

        let correlation = calculate_correlation(samples, offset, pattern_window);
        pattern_score = pattern_score.max(correlation);
    }

    pattern_score
}

/// Calculate correlation between signal and its delayed version
/// Uses SIMD-friendly operations for better performance
#[inline]
fn calculate_correlation(samples: &[f32], offset: usize, window_size: usize) -> f32 {
    let end = (samples.len() - offset).min(window_size);
    if end == 0 {
        return 0.0;
    }

    // Process in chunks for better CPU cache usage
    const CHUNK_SIZE: usize = 8;
    let mut sum_xy = 0.0;
    let mut sum_x2 = 0.0;
    let mut sum_y2 = 0.0;

    // Main loop - process in chunks
    let chunks = end / CHUNK_SIZE;
    for chunk in 0..chunks {
        let base = chunk * CHUNK_SIZE;

        // Unrolled loop for SIMD optimization
        for i in 0..CHUNK_SIZE {
            let idx = base + i;
            let x = samples[idx];
            let y = samples[idx + offset];
            sum_xy += x * y;
            sum_x2 += x * x;
            sum_y2 += y * y;
        }
    }

    // Handle remaining samples
    for i in (chunks * CHUNK_SIZE)..end {
        let x = samples[i];
        let y = samples[i + offset];
        sum_xy += x * y;
        sum_x2 += x * x;
        sum_y2 += y * y;
    }

    if sum_x2 == 0.0 || sum_y2 == 0.0 {
        return 0.0;
    }

    (sum_xy / (sum_x2.sqrt() * sum_y2.sqrt())).abs()
}

/// Calculate energy in low frequency bands (potential room tone/AC noise)
pub fn calculate_low_freq_energy_ratio(samples: &[f32], _sample_rate: u32) -> f32 {
    // Simple approach: count zero crossings as proxy for frequency content
    // Low zero-crossing rate indicates low frequency content
    let zero_crossings = count_zero_crossings(samples);
    let crossing_rate = zero_crossings as f32 / samples.len() as f32;

    // Also calculate energy variance - low freq noise tends to be more stable
    let energy_variance = calculate_energy_variance(samples, 480); // 30ms windows

    // Combine metrics: low crossing rate + low variance = likely low freq noise
    let low_freq_score = (1.0 - crossing_rate * 10.0).max(0.0);
    let stability_score = (1.0 - energy_variance * 5.0).max(0.0);

    (low_freq_score + stability_score) / 2.0
}

/// Count zero crossings in audio signal
fn count_zero_crossings(samples: &[f32]) -> usize {
    if samples.len() < 2 {
        return 0;
    }

    let mut crossings = 0;
    let mut prev_sign = samples[0] >= 0.0;

    for &sample in &samples[1..] {
        let current_sign = sample >= 0.0;
        if current_sign != prev_sign {
            crossings += 1;
        }
        prev_sign = current_sign;
    }

    crossings
}

/// Calculate variance in energy across windows
fn calculate_energy_variance(samples: &[f32], window_size: usize) -> f32 {
    if samples.len() < window_size * 2 {
        return 0.0;
    }

    let mut energies = Vec::new();
    for i in (0..samples.len()).step_by(window_size) {
        let end = (i + window_size).min(samples.len());
        energies.push(calculate_rms(&samples[i..end]));
    }

    if energies.is_empty() {
        return 0.0;
    }

    let mean = energies.iter().sum::<f32>() / energies.len() as f32;
    let variance =
        energies.iter().map(|&e| (e - mean).powi(2)).sum::<f32>() / energies.len() as f32;

    variance.sqrt() / (mean + 1e-10) // Normalized standard deviation
}

/// Apply fade-out to audio samples
pub fn apply_fade_out(samples: &mut [f32], fade_samples: usize) {
    let fade_start = samples.len().saturating_sub(fade_samples);

    for (i, sample) in samples[fade_start..].iter_mut().enumerate() {
        let fade_factor = 1.0 - (i as f32 / fade_samples as f32);
        *sample *= fade_factor;
    }
}

/// Spectral analysis features for enhanced speech detection
#[derive(Debug, Clone)]
pub struct SpectralFeatures {
    pub spectral_centroid: f32,
    pub spectral_spread: f32,
    pub spectral_flux: f32,
    pub spectral_rolloff: f32,
    pub pitch_frequency: Option<f32>,
    pub harmonicity: f32,
}

/// Feature extraction configuration for performance tuning
#[derive(Debug, Clone, Copy)]
pub struct FeatureExtractionConfig {
    pub compute_spectral: bool,
    pub compute_pitch: bool,
    pub compute_harmonicity: bool,
    pub fft_size: Option<usize>, // None = use input size
}

impl Default for FeatureExtractionConfig {
    fn default() -> Self {
        Self {
            compute_spectral: true,
            compute_pitch: true,
            compute_harmonicity: true,
            fft_size: None,
        }
    }
}

impl FeatureExtractionConfig {
    /// Minimal config for real-time applications
    pub fn minimal() -> Self {
        Self {
            compute_spectral: true,
            compute_pitch: false,
            compute_harmonicity: false,
            fft_size: Some(512), // Fixed small FFT
        }
    }

    /// Full config for offline analysis
    pub fn full() -> Self {
        Self::default()
    }
}

/// Calculate spectral features with configurable extraction
pub fn calculate_spectral_features_selective(
    samples: &[f32],
    sample_rate: u32,
    config: FeatureExtractionConfig,
) -> SpectralFeatures {
    if samples.is_empty() {
        return SpectralFeatures {
            spectral_centroid: 0.0,
            spectral_spread: 0.0,
            spectral_flux: 0.0,
            spectral_rolloff: 0.0,
            pitch_frequency: None,
            harmonicity: 0.0,
        };
    }

    let (spectral_centroid, spectral_spread, spectral_rolloff, magnitude_spectrum, freq_bins) =
        if config.compute_spectral {
            // Resample to fixed FFT size if requested
            let working_samples = if let Some(fft_size) = config.fft_size {
                if samples.len() > fft_size {
                    // Simple downsampling
                    let step = samples.len() / fft_size;
                    samples
                        .iter()
                        .step_by(step)
                        .take(fft_size)
                        .copied()
                        .collect::<Vec<_>>()
                } else {
                    samples.to_vec()
                }
            } else {
                samples.to_vec()
            };

            let magnitude_spectrum = compute_magnitude_spectrum(&working_samples);
            let freq_bins = compute_frequency_bins(working_samples.len(), sample_rate);

            let spectral_centroid = calculate_spectral_centroid(&magnitude_spectrum, &freq_bins);
            let spectral_spread =
                calculate_spectral_spread(&magnitude_spectrum, &freq_bins, spectral_centroid);
            let spectral_rolloff =
                calculate_spectral_rolloff(&magnitude_spectrum, &freq_bins, 0.85);

            (
                spectral_centroid,
                spectral_spread,
                spectral_rolloff,
                Some(magnitude_spectrum),
                Some(freq_bins),
            )
        } else {
            (0.0, 0.0, 0.0, None, None)
        };

    let pitch_frequency = if config.compute_pitch {
        detect_pitch_autocorrelation(samples, sample_rate)
    } else {
        None
    };

    let harmonicity = if config.compute_harmonicity {
        if let (Some(ref spectrum), Some(ref bins)) = (magnitude_spectrum, freq_bins) {
            calculate_harmonicity(spectrum, pitch_frequency, bins)
        } else {
            0.0
        }
    } else {
        0.0
    };

    SpectralFeatures {
        spectral_centroid,
        spectral_spread,
        spectral_flux: 0.0, // Still requires previous frame
        spectral_rolloff,
        pitch_frequency,
        harmonicity,
    }
}

/// FFT-based spectrum analyzer with caching
pub struct SpectrumAnalyzer {
    planner: FftPlanner<f32>,
    fft_cache: Option<(usize, Arc<dyn rustfft::Fft<f32>>)>,
}

impl SpectrumAnalyzer {
    pub fn new() -> Self {
        Self {
            planner: FftPlanner::new(),
            fft_cache: None,
        }
    }

    pub fn compute_magnitude_spectrum(&mut self, samples: &[f32]) -> Vec<f32> {
        let n = samples.len();

        // Get or create FFT instance
        let fft = match &self.fft_cache {
            Some((cached_size, cached_fft)) if *cached_size == n => cached_fft.clone(),
            _ => {
                let fft = self.planner.plan_fft_forward(n);
                self.fft_cache = Some((n, fft.clone()));
                fft
            }
        };

        // Prepare complex buffer
        let mut buffer: Vec<Complex<f32>> = samples
            .iter()
            .map(|&s| Complex { re: s, im: 0.0 })
            .collect();

        // Apply window function (Hann window) to reduce spectral leakage
        for (i, sample) in buffer.iter_mut().enumerate() {
            let window = 0.5 * (1.0 - (2.0 * PI * i as f32 / (n - 1) as f32).cos());
            sample.re *= window;
        }

        // Perform FFT
        fft.process(&mut buffer);

        // Convert to magnitude spectrum
        buffer[..n / 2 + 1]
            .iter()
            .map(|c| (c.re * c.re + c.im * c.im).sqrt() / (n as f32).sqrt())
            .collect()
    }
}

impl Default for SpectrumAnalyzer {
    fn default() -> Self {
        Self::new()
    }
}

/// Compute magnitude spectrum using FFT (thread-safe version)
fn compute_magnitude_spectrum(samples: &[f32]) -> Vec<f32> {
    let mut analyzer = SpectrumAnalyzer::new();
    analyzer.compute_magnitude_spectrum(samples)
}

/// Compute frequency bins for spectrum
pub fn compute_frequency_bins(n_samples: usize, sample_rate: u32) -> Vec<f32> {
    let n_bins = n_samples / 2 + 1;
    (0..n_bins)
        .map(|i| i as f32 * sample_rate as f32 / n_samples as f32)
        .collect()
}

/// Calculate spectral centroid (brightness indicator)
pub fn calculate_spectral_centroid(spectrum: &[f32], freq_bins: &[f32]) -> f32 {
    let total_energy: f32 = spectrum.iter().sum();
    if total_energy == 0.0 {
        return 0.0;
    }

    let weighted_sum: f32 = spectrum
        .iter()
        .zip(freq_bins.iter())
        .map(|(&mag, &freq)| mag * freq)
        .sum();

    weighted_sum / total_energy
}

/// Calculate spectral spread (timbral width)
pub fn calculate_spectral_spread(spectrum: &[f32], freq_bins: &[f32], centroid: f32) -> f32 {
    let total_energy: f32 = spectrum.iter().sum();
    if total_energy == 0.0 {
        return 0.0;
    }

    let variance: f32 = spectrum
        .iter()
        .zip(freq_bins.iter())
        .map(|(&mag, &freq)| mag * (freq - centroid).powi(2))
        .sum::<f32>()
        / total_energy;

    variance.sqrt()
}

/// Calculate spectral rolloff point
fn calculate_spectral_rolloff(spectrum: &[f32], freq_bins: &[f32], threshold: f32) -> f32 {
    let total_energy: f32 = spectrum.iter().sum();
    let target_energy = total_energy * threshold;

    let mut cumulative_energy = 0.0;
    for (i, &mag) in spectrum.iter().enumerate() {
        cumulative_energy += mag;
        if cumulative_energy >= target_energy {
            return freq_bins.get(i).copied().unwrap_or(0.0);
        }
    }

    freq_bins.last().copied().unwrap_or(0.0)
}

/// Detect pitch using autocorrelation method
pub fn detect_pitch_autocorrelation(samples: &[f32], sample_rate: u32) -> Option<f32> {
    if samples.len() < 512 {
        return None;
    }

    // Typical human pitch range: 80-400 Hz
    let min_period = (sample_rate / 400) as usize; // ~40 samples at 16kHz
    let max_period = (sample_rate / 80) as usize; // ~200 samples at 16kHz

    let mut best_correlation = 0.0;
    let mut best_period = 0;

    // Normalize samples
    let rms = calculate_rms(samples);
    if rms < 0.01 {
        return None; // Too quiet
    }

    // Autocorrelation
    for period in min_period..=max_period.min(samples.len() / 2) {
        let mut correlation = 0.0;
        let mut norm_a = 0.0;
        let mut norm_b = 0.0;

        for i in 0..samples.len() - period {
            correlation += samples[i] * samples[i + period];
            norm_a += samples[i] * samples[i];
            norm_b += samples[i + period] * samples[i + period];
        }

        if norm_a > 0.0 && norm_b > 0.0 {
            correlation /= (norm_a * norm_b).sqrt();

            if correlation > best_correlation {
                best_correlation = correlation;
                best_period = period;
            }
        }
    }

    // Require minimum correlation for valid pitch
    if best_correlation > 0.3 && best_period > 0 {
        Some(sample_rate as f32 / best_period as f32)
    } else {
        None
    }
}

/// Calculate harmonicity (voiced vs unvoiced)
fn calculate_harmonicity(spectrum: &[f32], pitch: Option<f32>, freq_bins: &[f32]) -> f32 {
    let Some(fundamental) = pitch else {
        return 0.0;
    };

    let mut harmonic_energy = 0.0;
    let total_energy: f32 = spectrum.iter().sum();

    if total_energy == 0.0 {
        return 0.0;
    }

    // Sum energy at harmonic frequencies
    for harmonic in 1..=5 {
        let target_freq = fundamental * harmonic as f32;
        let tolerance = 20.0; // Hz

        for (i, &freq) in freq_bins.iter().enumerate() {
            if (freq - target_freq).abs() < tolerance {
                if let Some(&mag) = spectrum.get(i) {
                    harmonic_energy += mag;
                }
            }
        }
    }

    harmonic_energy / total_energy
}

/// Onset detection for speech boundaries
pub struct OnsetDetector {
    prev_spectrum: Vec<f32>,
    threshold: f32,
}

impl OnsetDetector {
    pub fn new(spectrum_size: usize) -> Self {
        Self {
            prev_spectrum: vec![0.0; spectrum_size],
            threshold: 0.3,
        }
    }

    /// Detect onset using spectral flux
    pub fn detect_onset(&mut self, samples: &[f32]) -> bool {
        let spectrum = compute_magnitude_spectrum(samples);

        // Calculate spectral flux (positive differences only)
        let mut flux = 0.0;
        for (i, &mag) in spectrum.iter().enumerate() {
            if let Some(&prev_mag) = self.prev_spectrum.get(i) {
                let diff = mag - prev_mag;
                if diff > 0.0 {
                    flux += diff;
                }
            }
        }

        // Update previous spectrum
        self.prev_spectrum = spectrum;

        // Normalize by spectrum size
        flux /= self.prev_spectrum.len() as f32;

        flux > self.threshold
    }

    /// Adapt threshold based on noise floor
    pub fn adapt_threshold(&mut self, noise_floor: f32) {
        self.threshold = 0.3 + noise_floor * 0.5;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_rms() {
        let silence = vec![0.0f32; 100];
        assert_eq!(calculate_rms(&silence), 0.0);

        let sine_wave: Vec<f32> = (0..100).map(|i| (i as f32 * 0.1).sin()).collect();
        let rms = calculate_rms(&sine_wave);
        assert!(rms > 0.0 && rms < 1.0);
    }

    #[test]
    fn test_energy_decay() {
        // Create gradually decaying signal
        let mut samples = vec![1.0f32; 1000];
        for i in 0..1000 {
            samples[i] *= 1.0 - i as f32 / 1000.0;
        }

        let profile = analyze_energy_decay(&samples, 100);
        assert!(profile.is_gradual);
        assert!(profile.decay_rate > 0.0);
        assert!(profile.final_energy_ratio < 0.5);
    }

    #[test]
    fn test_fade_out() {
        let mut samples = vec![1.0f32; 100];
        apply_fade_out(&mut samples, 20);

        assert_eq!(samples[79], 1.0); // Before fade
        assert!(samples[80] < 1.0); // Start of fade
        assert!(samples[99] < 0.05); // End should be near zero
    }

    #[test]
    fn test_repetitive_patterns() {
        // Create repetitive signal
        let mut samples = Vec::new();
        let pattern = vec![0.5, -0.5, 0.3, -0.3];
        for _ in 0..100 {
            samples.extend_from_slice(&pattern);
        }

        let score = detect_repetitive_patterns(&samples, 4);
        assert!(score > 0.8, "Should detect strong repetitive pattern");

        // Random noise should have low pattern score
        let noise: Vec<f32> = (0..400)
            .map(|_| (rand::random::<f32>() - 0.5) * 2.0)
            .collect();
        let noise_score = detect_repetitive_patterns(&noise, 4);
        assert!(
            noise_score < 0.3,
            "Random noise should have low pattern score"
        );
    }

    #[test]
    fn test_energy_cliff_detection() {
        // Create signal with energy cliff
        let mut samples = vec![0.8f32; 1000];
        // Sudden drop
        for i in 500..1000 {
            samples[i] = 0.1;
        }

        let peak = calculate_peak_rms(&samples, 100);
        assert!(peak > 0.7);

        // Verify we can detect the cliff
        let window_size = 100;
        for i in 400..600 {
            if i + window_size < samples.len() {
                let current = calculate_rms(&samples[i..i + window_size]);
                let next = calculate_rms(&samples[i + window_size..i + window_size * 2]);
                if current > 0.5 && next < current * 0.2 {
                    // Found cliff
                    assert!(i >= 400 && i <= 500);
                    break;
                }
            }
        }
    }

    #[test]
    fn test_spectral_features() {
        // Test with simple sine wave
        let sample_rate = 16000;
        let frequency = 440.0; // A4
        let samples: Vec<f32> = (0..1024)
            .map(|i| (2.0 * PI * frequency * i as f32 / sample_rate as f32).sin())
            .collect();

        let features = calculate_spectral_features_selective(
            &samples,
            sample_rate,
            FeatureExtractionConfig::default(),
        );

        // Centroid should be near the fundamental frequency
        assert!(
            (features.spectral_centroid - frequency).abs() < 100.0,
            "Centroid {} should be near {}",
            features.spectral_centroid,
            frequency
        );

        // Should detect pitch
        assert!(features.pitch_frequency.is_some());
        if let Some(pitch) = features.pitch_frequency {
            assert!(
                (pitch - frequency).abs() < 50.0,
                "Detected pitch {} should be near {}",
                pitch,
                frequency
            );
        }

        // Pure sine wave should have high harmonicity
        assert!(features.harmonicity > 0.5);
    }

    #[test]
    fn test_pitch_detection() {
        let sample_rate = 16000;

        // Test with known frequencies
        for &freq in &[100.0, 200.0, 300.0, 400.0] {
            let samples: Vec<f32> = (0..2048)
                .map(|i| (2.0 * PI * freq * i as f32 / sample_rate as f32).sin() * 0.5)
                .collect();

            if let Some(detected) = detect_pitch_autocorrelation(&samples, sample_rate) {
                let error = (detected - freq).abs();
                assert!(
                    error < 20.0,
                    "Pitch detection error too large: {} Hz (expected {}, got {})",
                    error,
                    freq,
                    detected
                );
            }
        }
    }

    #[test]
    fn test_onset_detection() {
        let mut detector = OnsetDetector::new(513); // FFT size / 2 + 1

        // Silence should not trigger onset
        let silence = vec![0.0f32; 1024];
        assert!(!detector.detect_onset(&silence));

        // Sudden loud signal should trigger onset
        let loud: Vec<f32> = (0..1024).map(|i| (i as f32 * 0.01).sin() * 0.8).collect();
        assert!(detector.detect_onset(&loud));

        // Same signal again should not trigger onset
        assert!(!detector.detect_onset(&loud));
    }

    #[test]
    fn test_speech_quality_analysis() {
        let sample_rate = 16000;

        // Simulate speech-like signal (multiple harmonics)
        let mut speech = vec![0.0f32; 2048];
        for i in 0..2048 {
            let t = i as f32 / sample_rate as f32;
            // Fundamental + harmonics
            speech[i] = (2.0 * PI * 200.0 * t).sin() * 0.3
                + (2.0 * PI * 400.0 * t).sin() * 0.2
                + (2.0 * PI * 600.0 * t).sin() * 0.1
                + (rand::random::<f32>() - 0.5) * 0.05; // Add some noise
        }

        let features = calculate_spectral_features_selective(
            &speech,
            sample_rate,
            FeatureExtractionConfig::default(),
        );
        let quality = crate::SmartPredictor::calculate_speech_quality_from_features(&features);
        assert!(quality > 0.5, "Speech-like signal should have good quality");

        // Pure noise should have low quality
        let noise: Vec<f32> = (0..2048)
            .map(|_| (rand::random::<f32>() - 0.5) * 0.3)
            .collect();
        let noise_features = calculate_spectral_features_selective(
            &noise,
            sample_rate,
            FeatureExtractionConfig::default(),
        );
        let noise_quality =
            crate::SmartPredictor::calculate_speech_quality_from_features(&noise_features);
        assert!(noise_quality < 0.3, "Noise should have low speech quality");
    }
}
