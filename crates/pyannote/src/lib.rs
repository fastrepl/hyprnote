#[cfg(feature = "cloud")]
pub mod cloud;

#[cfg(not(feature = "local"))]
pub mod local;

#[derive(Debug, PartialEq, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct SpeakerSegment {
    pub label: String,
    pub confidence: Option<f32>,
    pub start: f32,
    pub end: f32,
}
