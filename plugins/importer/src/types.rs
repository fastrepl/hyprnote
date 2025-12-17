use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct ImportedNote {
    pub id: String,
    pub title: String,
    pub content: String,
    pub created_at: String,
    pub updated_at: String,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct ImportedTranscriptSegment {
    pub id: String,
    pub start_timestamp: String,
    pub end_timestamp: String,
    pub text: String,
    pub speaker: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct ImportedTranscript {
    pub id: String,
    pub title: String,
    pub created_at: String,
    pub updated_at: String,
    pub segments: Vec<ImportedTranscriptSegment>,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum ImportSourceKind {
    Granola,
    HyprnoteV0Stable,
    HyprnoteV0Nightly,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct ImportSourceInfo {
    pub kind: ImportSourceKind,
    pub name: String,
    pub description: String,
}
