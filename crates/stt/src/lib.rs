mod deepgram;
mod types;

#[cfg(feature = "realtime")]
pub mod realtime;

#[cfg(feature = "recorded")]
pub mod recorded;

#[derive(Debug, PartialEq, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct SpeakerSegment {
    pub label: String,
    pub confidence: Option<f32>,
    pub start: f32,
    pub end: f32,
}
