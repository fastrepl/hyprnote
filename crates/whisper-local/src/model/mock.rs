use crate::Segment;
use hypr_whisper::Language;

#[derive(Default)]
pub struct WhisperBuilder {}

#[derive(Default)]
pub struct Whisper {}

impl WhisperBuilder {
    pub fn model_path(self, _model_path: impl Into<String>) -> Self {
        self
    }

    pub fn languages(self, _languages: Vec<Language>) -> Self {
        self
    }

    pub fn build(self) -> Result<Whisper, crate::Error> {
        Ok(Whisper {})
    }
}

impl Whisper {
    pub fn builder() -> WhisperBuilder {
        WhisperBuilder::default()
    }

    pub fn transcribe(&mut self, _samples: &[f32]) -> Result<Vec<Segment>, crate::Error> {
        Ok(vec![Segment {
            text: "mock".to_string(),
            language: None,
            start: 0.0,
            end: 1.0,
            confidence: 1.0,
            meta: None,
        }])
    }
}
