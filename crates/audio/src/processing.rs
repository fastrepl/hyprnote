use dasp::sample::{FromSample, ToSample};

// Modified from https://github.com/mediar-ai/screenpipe/blob/275a8cce45db1691591ef2ff2d461b04e3886cf0/screenpipe-audio/src/audio_processing.rs#L13C1-L37C1
fn normalize<T: ToSample<f32> + FromSample<f32> + Copy>(audio: &[T]) -> Vec<T> {
    let f32_samples: Vec<f32> = audio.iter().map(|&x| x.to_sample_()).collect();

    let rms = (f32_samples.iter().map(|&x| x * x).sum::<f32>() / f32_samples.len() as f32).sqrt();
    let peak = f32_samples
        .iter()
        .fold(0.0f32, |max, &sample| max.max(sample.abs()));

    if rms == 0.0 || peak == 0.0 {
        return audio.to_vec();
    }

    let target_rms = 0.2;
    let target_peak = 0.95;

    let rms_scaling = target_rms / rms;
    let peak_scaling = target_peak / peak;

    let scaling_factor = rms_scaling.min(peak_scaling);

    f32_samples
        .iter()
        .map(|&sample| (sample * scaling_factor).to_sample_())
        .collect()
}

pub fn mix<T: ToSample<f32> + FromSample<f32> + Copy>(audio1: &[T], audio2: &[T]) -> Vec<T> {
    let len = audio1.len().min(audio2.len());

    let samples1: Vec<f32> = normalize(
        &audio1[..len]
            .iter()
            .map(|&x| x.to_sample_())
            .collect::<Vec<f32>>(),
    );
    let samples2: Vec<f32> = normalize(
        &audio2[..len]
            .iter()
            .map(|&x| x.to_sample_())
            .collect::<Vec<f32>>(),
    );

    samples1
        .iter()
        .zip(samples2.iter())
        .map(|(&s1, &s2)| {
            if s1.abs() < 1e-6 {
                s2
            } else if s2.abs() < 1e-6 {
                s1
            } else {
                // 0.7071 ≈ 1/√2, provides -3dB attenuation for equal-level signals
                (s1 + s2) * 0.7071
            }
        })
        .map(|sample| sample.to_sample_())
        .collect()
}
