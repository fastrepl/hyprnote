use super::Segment;

pub struct WhisperReporter {
    base_dir: std::path::PathBuf,
    uid: String,
    counter: u32,
    audio_spec: hound::WavSpec,
}

impl Default for WhisperReporter {
    fn default() -> Self {
        let base_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("data");
        std::fs::create_dir_all(&base_dir).unwrap();

        let audio_spec = hound::WavSpec {
            channels: 1,
            sample_rate: 16000,
            bits_per_sample: 32,
            sample_format: hound::SampleFormat::Float,
        };

        Self {
            base_dir,
            uid: uuid::Uuid::new_v4().to_string(),
            counter: 0,
            audio_spec,
        }
    }
}

impl WhisperReporter {
    pub fn save(&mut self, audio: &[f32], segments: &[Segment]) {
        let file_path = self
            .base_dir
            .join(format!("{}_{}.json", self.uid, self.counter));
        let audio_path = self
            .base_dir
            .join(format!("{}_{}.wav", self.uid, self.counter));

        let mut audio_writer = hound::WavWriter::create(audio_path, self.audio_spec).unwrap();
        for sample in audio {
            audio_writer.write_sample(*sample).unwrap();
        }
        audio_writer.finalize().unwrap();

        let mut json_writer = std::fs::File::create(file_path).unwrap();
        serde_json::to_writer(&mut json_writer, &segments).unwrap();

        self.counter += 1;
    }
}
