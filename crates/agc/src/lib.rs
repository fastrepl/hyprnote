use dagc::MonoAgc;
use earshot::{VoiceActivityDetector, VoiceActivityProfile};
use hypr_audio_utils::f32_to_i16_samples;

pub struct VadAgc {
    agc: MonoAgc,
    vad: VoiceActivityDetector,
}

impl VadAgc {
    pub fn new(desired_output_rms: f32, distortion_factor: f32) -> Self {
        Self {
            agc: MonoAgc::new(desired_output_rms, distortion_factor).expect("failed_to_create_agc"),
            vad: VoiceActivityDetector::new(VoiceActivityProfile::QUALITY),
        }
    }

    pub fn process(&mut self, samples: &mut [f32]) {
        let frame_size = Self::choose_optimal_frame_size(samples.len());

        if samples.len() <= frame_size {
            let mut padded = samples.to_vec();
            padded.resize(frame_size, 0.0);

            let i16_samples = f32_to_i16_samples(&padded);
            let is_speech = self.vad.predict_16khz(&i16_samples).unwrap_or(true);

            self.agc.freeze_gain(!is_speech);
            self.agc.process(samples);
        } else {
            for chunk in samples.chunks_mut(frame_size) {
                let mut padded = chunk.to_vec();
                if padded.len() < frame_size {
                    padded.resize(frame_size, 0.0);
                }

                let i16_samples = f32_to_i16_samples(&padded);
                let is_speech = self.vad.predict_16khz(&i16_samples).unwrap_or(true);

                self.agc.freeze_gain(!is_speech);
                self.agc.process(chunk);
            }
        }
    }

    // https://docs.rs/earshot/0.1.0/earshot/struct.VoiceActivityDetector.html#method.predict_16khz
    fn choose_optimal_frame_size(len: usize) -> usize {
        const FRAME_10MS: usize = 160;
        const FRAME_20MS: usize = 320;
        const FRAME_30MS: usize = 480;

        if len % FRAME_30MS == 0 || len < FRAME_30MS {
            FRAME_30MS
        } else if len % FRAME_20MS == 0 {
            FRAME_20MS
        } else if len % FRAME_10MS == 0 {
            FRAME_10MS
        } else {
            let padding_30 = (FRAME_30MS - (len % FRAME_30MS)) % FRAME_30MS;
            let padding_20 = (FRAME_20MS - (len % FRAME_20MS)) % FRAME_20MS;
            let padding_10 = (FRAME_10MS - (len % FRAME_10MS)) % FRAME_10MS;

            if padding_30 <= padding_20 && padding_30 <= padding_10 {
                FRAME_30MS
            } else if padding_20 <= padding_10 {
                FRAME_20MS
            } else {
                FRAME_10MS
            }
        }
    }

    pub fn gain(&self) -> f32 {
        self.agc.gain()
    }
}

impl Default for VadAgc {
    fn default() -> Self {
        Self {
            agc: MonoAgc::new(0.03, 0.0001).expect("failed_to_create_agc"),
            vad: VoiceActivityDetector::new(VoiceActivityProfile::VERY_AGGRESSIVE),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    use rodio::Source;

    #[test]
    fn test_agc() {
        let input_audio = rodio::Decoder::new(std::io::BufReader::new(
            std::fs::File::open(hypr_data::english_1::AUDIO_PATH).unwrap(),
        ))
        .unwrap();
        let original_samples = input_audio.convert_samples::<f32>().collect::<Vec<_>>();

        let mut agc = VadAgc::default();

        let mut processed_samples = Vec::new();
        let chunks = original_samples.chunks(512);

        for chunk in chunks {
            let mut target = chunk.to_vec();
            agc.process(&mut target);

            for &sample in &target {
                processed_samples.push(sample);
            }
        }

        let wav = hound::WavSpec {
            channels: 1,
            sample_rate: 16000,
            bits_per_sample: 32,
            sample_format: hound::SampleFormat::Float,
        };
        let mut writer = hound::WavWriter::create("./test.wav", wav).unwrap();
        for sample in processed_samples {
            writer.write_sample(sample).unwrap();
        }
    }
}
