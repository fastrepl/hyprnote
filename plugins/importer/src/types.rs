use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct ImportedNote {
    pub id: String,
    pub title: String,
    pub content: String,
    pub raw_md: Option<String>,
    pub enhanced_md: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub folder_id: Option<String>,
    pub event_id: Option<String>,
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
pub struct ImportedWord {
    pub id: String,
    pub start_ms: Option<f64>,
    pub end_ms: Option<f64>,
    pub text: String,
    pub speaker: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct ImportedTranscript {
    pub id: String,
    pub session_id: String,
    pub title: String,
    pub created_at: String,
    pub updated_at: String,
    pub segments: Vec<ImportedTranscriptSegment>,
    pub words: Vec<ImportedWord>,
    pub start_ms: Option<f64>,
    pub end_ms: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct ImportedHuman {
    pub id: String,
    pub created_at: String,
    pub name: String,
    pub email: Option<String>,
    pub org_id: Option<String>,
    pub job_title: Option<String>,
    pub linkedin_username: Option<String>,
    pub is_user: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct ImportedOrganization {
    pub id: String,
    pub created_at: String,
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct ImportedSessionParticipant {
    pub session_id: String,
    pub human_id: String,
    pub source: String,
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
