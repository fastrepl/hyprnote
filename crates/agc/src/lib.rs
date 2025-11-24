use dagc::MonoAgc;
use earshot::{VoiceActivityDetector, VoiceActivityProfile};
use hypr_audio_utils::f32_to_i16_samples;

pub struct VadAgc {
    agc: MonoAgc,
    vad: VoiceActivityDetector,
    gate_window: [bool; 3],
    gate_index: usize,
    gate_min_speech_votes: usize,
}

impl VadAgc {
    pub fn new(desired_output_rms: f32, distortion_factor: f32) -> Self {
        Self {
            agc: MonoAgc::new(desired_output_rms, distortion_factor).expect("failed_to_create_agc"),
            vad: VoiceActivityDetector::new(VoiceActivityProfile::QUALITY),
            gate_window: [false; 3],
            gate_index: 0,
            gate_min_speech_votes: 2,
        }
    }

    pub fn process(&mut self, samples: &mut [f32]) {
        self.process_internal(samples, false);
    }

    pub fn process_with_gate(&mut self, samples: &mut [f32]) {
        self.process_internal(samples, true);
    }

    fn process_internal(&mut self, samples: &mut [f32], gate_non_speech: bool) {
        let frame_size = Self::choose_optimal_frame_size(samples.len());

        if samples.len() <= frame_size {
            let mut padded = samples.to_vec();
            padded.resize(frame_size, 0.0);

            let i16_samples = f32_to_i16_samples(&padded);
            let raw_is_speech = self.vad.predict_16khz(&i16_samples).unwrap_or(true);

            self.agc.freeze_gain(!raw_is_speech);
            self.agc.process(samples);

            let should_pass = self.gate_decision(raw_is_speech, gate_non_speech);
            if gate_non_speech && !should_pass {
                samples.fill(0.0);
            }
        } else {
            for chunk in samples.chunks_mut(frame_size) {
                let mut padded = chunk.to_vec();
                if padded.len() < frame_size {
                    padded.resize(frame_size, 0.0);
                }

                let i16_samples = f32_to_i16_samples(&padded);
                let raw_is_speech = self.vad.predict_16khz(&i16_samples).unwrap_or(true);

                self.agc.freeze_gain(!raw_is_speech);
                self.agc.process(chunk);

                let should_pass = self.gate_decision(raw_is_speech, gate_non_speech);
                if gate_non_speech && !should_pass {
                    chunk.fill(0.0);
                }
            }
        }
    }

    fn gate_decision(&mut self, raw_is_speech: bool, gate_non_speech: bool) -> bool {
        if !gate_non_speech {
            return true;
        }

        self.gate_window[self.gate_index] = raw_is_speech;
        self.gate_index = (self.gate_index + 1) % self.gate_window.len();

        let speech_votes = self.gate_window.iter().copied().filter(|&b| b).count();

        speech_votes >= self.gate_min_speech_votes
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

    pub fn reset(&mut self) {
        self.vad.reset();
        self.gate_window = [false; 3];
        self.gate_index = 0;
    }
}

impl Default for VadAgc {
    fn default() -> Self {
        Self {
            agc: MonoAgc::new(0.03, 0.0001).expect("failed_to_create_agc"),
            vad: VoiceActivityDetector::new(VoiceActivityProfile::VERY_AGGRESSIVE),
            gate_window: [false; 3],
            gate_index: 0,
            gate_min_speech_votes: 2,
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
