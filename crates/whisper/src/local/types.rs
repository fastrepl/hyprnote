use lazy_static::lazy_static;
use regex::Regex;

lazy_static! {
    static ref TRAILING_DOTS: Regex = Regex::new(r"\.{2,}$").unwrap();
}

// https://github.com/floneum/floneum/blob/52967ae/models/rwhisper/src/lib.rs#L116
#[derive(Debug, Default, serde::Serialize, serde::Deserialize)]
pub struct Segment {
    pub text: String,
    pub start: f32,
    pub end: f32,
    pub confidence: f32,
}

impl Segment {
    pub fn text(&self) -> &str {
        &self.text
    }

    pub fn start(&self) -> f32 {
        self.start
    }

    pub fn end(&self) -> f32 {
        self.end
    }

    pub fn duration(&self) -> f32 {
        self.end - self.start
    }

    pub fn confidence(&self) -> f32 {
        self.confidence
    }

    pub fn trim(&mut self) {
        self.text = TRAILING_DOTS.replace(&self.text, "").to_string();
    }
}
