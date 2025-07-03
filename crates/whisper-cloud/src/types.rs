#[derive(Debug, serde::Deserialize)]
pub struct WhisperOutput {
    pub task: String,
    pub language: String,
    pub text: String,
    pub words: Vec<WhisperWord>,
    pub segments: Vec<WhisperSegment>,
}

#[derive(Debug, serde::Deserialize)]
pub struct WhisperWord {
    pub word: String,
    pub language: String,
    pub probability: f64,
    pub hallucination_score: f64,
    pub is_final: bool,
}

#[derive(Debug, serde::Deserialize)]
pub struct WhisperSegment {
    pub id: usize,
    // position of this segment begins, measured in samples
    pub seek: usize,
    pub text: String,
    pub language: String,
    pub tokens: Vec<serde_json::Value>,
    pub words: Vec<WhisperWord>,
}
