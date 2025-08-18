use std::ops::{Deref, DerefMut};

use dagc::MonoAgc;

#[derive(Debug)]
pub struct Agc {
    agc: MonoAgc,
}

impl Agc {
    pub fn new(desired_output_rms: f32, distortion_factor: f32) -> Self {
        Self {
            agc: MonoAgc::new(desired_output_rms, distortion_factor).expect("failed_to_create_agc"),
        }
    }
}

impl Default for Agc {
    fn default() -> Self {
        Self {
            agc: MonoAgc::new(0.1, 0.000001).expect("failed_to_create_agc"),
        }
    }
}

impl Deref for Agc {
    type Target = MonoAgc;

    fn deref(&self) -> &Self::Target {
        &self.agc
    }
}

impl DerefMut for Agc {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.agc
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    use rodio::Source;

    #[test]
    fn test_agc() {
        let test_params = vec![
            (0.05, 0.000001),
            (0.1, 0.000001),
            (0.2, 0.000001),
            (0.1, 0.00001),
            (0.1, 0.0001),
            (0.3, 0.0001),
        ];

        let input_audio = rodio::Decoder::new(std::io::BufReader::new(
            std::fs::File::open(hypr_data::english_1::AUDIO_PATH).unwrap(),
        ))
        .unwrap();
        let original_samples = input_audio.convert_samples::<f32>().collect::<Vec<_>>();

        for (desired_rms, distortion_factor) in test_params {
            let mut agc = Agc::new(desired_rms, distortion_factor);

            let filename = format!(
                "./agc_output_rms{:.3}_dist{:.6}.wav",
                desired_rms, distortion_factor
            );

            let mut output_audio = hound::WavWriter::create(
                &filename,
                hound::WavSpec {
                    channels: 1,
                    sample_rate: 16000,
                    bits_per_sample: 32,
                    sample_format: hound::SampleFormat::Float,
                },
            )
            .unwrap();

            let mut processed_samples = Vec::new();
            let chunks = original_samples.chunks(512);

            for chunk in chunks {
                let mut target = chunk.to_vec();
                agc.process(&mut target);

                for &sample in &target {
                    output_audio.write_sample(sample).unwrap();
                    processed_samples.push(sample);
                }
            }

            output_audio.finalize().unwrap();
        }
    }
}
