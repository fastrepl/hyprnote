//! Audio analysis utilities for energy-based silence detection and hallucination prevention

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
    pub decay_rate: f32,
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
fn calculate_correlation(samples: &[f32], offset: usize, window_size: usize) -> f32 {
    let end = (samples.len() - offset).min(window_size);
    if end == 0 {
        return 0.0;
    }

    let mut sum_xy = 0.0;
    let mut sum_x2 = 0.0;
    let mut sum_y2 = 0.0;

    for i in 0..end {
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

/// Apply fade-in to audio samples
pub fn apply_fade_in(samples: &mut [f32], fade_samples: usize) {
    let fade_end = fade_samples.min(samples.len());

    for (i, sample) in samples[..fade_end].iter_mut().enumerate() {
        let fade_factor = i as f32 / fade_samples as f32;
        *sample *= fade_factor;
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
            samples[i] *= (1.0 - i as f32 / 1000.0);
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
}
