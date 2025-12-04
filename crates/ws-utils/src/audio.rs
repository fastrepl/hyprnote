use hypr_audio_utils::{bytes_to_f32_samples, mix_audio_f32};

pub enum AudioSamples {
    Mono(Vec<f32>),
    Stereo { left: Vec<f32>, right: Vec<f32> },
}

impl AudioSamples {
    pub fn to_mono(self) -> Vec<f32> {
        match self {
            AudioSamples::Mono(samples) => samples,
            AudioSamples::Stereo { left, right } => mix_audio_f32(&left, &right),
        }
    }

    pub fn is_empty(&self) -> bool {
        match self {
            AudioSamples::Mono(s) => s.is_empty(),
            AudioSamples::Stereo { left, .. } => left.is_empty(),
        }
    }
}

pub fn deinterleave_stereo(data: &[u8]) -> AudioSamples {
    let samples: Vec<i16> = data
        .chunks_exact(2)
        .map(|chunk| i16::from_le_bytes([chunk[0], chunk[1]]))
        .collect();

    let mut left = Vec::with_capacity(samples.len() / 2);
    let mut right = Vec::with_capacity(samples.len() / 2);

    for chunk in samples.chunks_exact(2) {
        left.push(chunk[0] as f32 / 32768.0);
        right.push(chunk[1] as f32 / 32768.0);
    }

    AudioSamples::Stereo { left, right }
}

pub fn bytes_to_mono(data: &[u8]) -> AudioSamples {
    AudioSamples::Mono(bytes_to_f32_samples(data))
}
