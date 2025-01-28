use dasp::sample::{FromSample, ToSample};

// https://github.com/RustAudio/rodio/blob/8fd0337/src/mixer.rs
pub fn mix<T: ToSample<f32> + FromSample<f32> + Copy>(audio1: &[T], audio2: &[T]) -> Vec<T> {
    let len = audio1.len().min(audio2.len());

    let samples1: Vec<f32> = audio1[..len].iter().map(|&x| x.to_sample_()).collect();
    let samples2: Vec<f32> = audio2[..len].iter().map(|&x| x.to_sample_()).collect();

    let mixed: Vec<f32> = samples1
        .iter()
        .zip(samples2.iter())
        .map(|(&s1, &s2)| {
            if s1.abs() < 1e-6 {
                s2
            } else if s2.abs() < 1e-6 {
                s1
            } else {
                (s1 + s2) * 0.7071
            }
        })
        .collect();

    mixed.into_iter().map(|x| x.to_sample_()).collect()
}
