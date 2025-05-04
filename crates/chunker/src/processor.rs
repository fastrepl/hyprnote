use crate::Predictor;

pub struct ChunkProcessor<P: Predictor> {
    in_speech: bool,
    buffer: Vec<f32>,
    predictor: P,
}

impl<P: Predictor> ChunkProcessor<P> {
    pub fn new(predictor: P) -> Self {
        Self {
            in_speech: false,
            buffer: Vec::new(),
            predictor,
        }
    }

    pub fn window_samples(&self, sr: u32) -> usize {
        self.predictor.window_samples(sr)
    }

    pub fn process(&mut self, samples: &[f32]) -> Result<Option<Vec<f32>>, crate::Error> {
        let prob = self.predictor.predict(samples)?;

        let is_speech_now = prob > 0.5;
        let was_in_speech = self.in_speech;
        self.in_speech = is_speech_now;

        let result = match (was_in_speech, is_speech_now) {
            (true, true) => {
                self.buffer.extend_from_slice(samples);
                None
            }
            (true, false) => {
                let speech_chunk = std::mem::take(&mut self.buffer);
                Some(speech_chunk)
            }
            (false, true) => {
                self.buffer.extend_from_slice(samples);
                None
            }
            (false, false) => None,
        };

        Ok(result)
    }
}
