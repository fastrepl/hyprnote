use dagc::MonoAgc;
use earshot::{VoiceActivityDetector, VoiceActivityProfile};
use hypr_audio_utils::f32_to_i16_samples;

pub struct VadAgc {
    agc: MonoAgc,
    vad: VoiceActivityDetector,
    frame_size: usize,
    vad_tail: Vec<f32>,
    // Fail-open: treat unknown regions as speech so we don't freeze gain forever
    last_is_speech: bool,
}

impl VadAgc {
    pub fn new(desired_output_rms: f32, distortion_factor: f32) -> Self {
        Self {
            agc: MonoAgc::new(desired_output_rms, distortion_factor).expect("failed_to_create_agc"),
            vad: VoiceActivityDetector::new(VoiceActivityProfile::QUALITY),
            frame_size: 0,
            vad_tail: Vec::new(),
            last_is_speech: true,
        }
    }

    pub fn process(&mut self, samples: &mut [f32]) {
        if samples.is_empty() {
            return;
        }

        if self.frame_size == 0 {
            self.frame_size = Self::choose_optimal_frame_size(samples.len());
        }
        let frame_size = self.frame_size;

        let mut pos = 0;

        if !self.vad_tail.is_empty() {
            let needed = frame_size - self.vad_tail.len();
            let to_take = needed.min(samples.len());

            let mut frame_f32 = std::mem::take(&mut self.vad_tail);
            frame_f32.reserve(frame_size - frame_f32.len());
            frame_f32.extend_from_slice(&samples[..to_take]);

            if frame_f32.len() == frame_size {
                let i16_samples = f32_to_i16_samples(&frame_f32);
                let is_speech = self.vad.predict_16khz(&i16_samples).unwrap_or(true);
                self.last_is_speech = is_speech;

                self.agc.freeze_gain(!is_speech);
                self.agc.process(&mut samples[..to_take]);

                pos = to_take;
            } else {
                self.vad_tail = frame_f32;

                self.agc.freeze_gain(!self.last_is_speech);
                self.agc.process(samples);
                return;
            }
        }

        while samples.len() - pos >= frame_size {
            let frame = &mut samples[pos..pos + frame_size];

            let i16_samples = f32_to_i16_samples(frame);
            let is_speech = self.vad.predict_16khz(&i16_samples).unwrap_or(true);
            self.last_is_speech = is_speech;

            self.agc.freeze_gain(!is_speech);
            self.agc.process(frame);

            pos += frame_size;
        }

        if pos < samples.len() {
            self.vad_tail.clear();
            self.vad_tail.extend_from_slice(&samples[pos..]);

            self.agc.freeze_gain(!self.last_is_speech);
            self.agc.process(&mut samples[pos..]);
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
            frame_size: 0,
            vad_tail: Vec::new(),
            last_is_speech: true,
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

    #[test]
    fn test_cross_call_framing() {
        let input_audio = rodio::Decoder::new(std::io::BufReader::new(
            std::fs::File::open(hypr_data::english_1::AUDIO_PATH).unwrap(),
        ))
        .unwrap();
        let original_samples = input_audio.convert_samples::<f32>().collect::<Vec<_>>();

        let mut agc = VadAgc::default();
        let mut processed = Vec::new();
        for chunk in original_samples.chunks(200) {
            let mut target = chunk.to_vec();
            agc.process(&mut target);
            processed.extend_from_slice(&target);
        }

        assert_eq!(processed.len(), original_samples.len());

        for &sample in &processed {
            assert!(sample.is_finite(), "Sample is not finite");
        }

        let rms: f32 = processed.iter().map(|&s| s * s).sum::<f32>() / processed.len() as f32;
        let rms = rms.sqrt();
        assert!(
            rms > 0.0 && rms < 1.0,
            "RMS {} is out of expected range",
            rms
        );
    }
}
