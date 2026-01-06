use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum ImportSourceKind {
    Granola,
    HyprnoteV0Stable,
    HyprnoteV0Nightly,
    AsIs,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct ImportSourceInfo {
    pub kind: ImportSourceKind,
    pub name: String,
    pub path: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, specta::Type)]
pub struct ImportStats {
    pub notes_count: usize,
    pub transcripts_count: usize,
    pub humans_count: usize,
    pub organizations_count: usize,
    pub participants_count: usize,
    pub templates_count: usize,
}

pub struct ImportResult {
    pub notes: Vec<ImportedNote>,
    pub transcripts: Vec<ImportedTranscript>,
    pub humans: Vec<ImportedHuman>,
    pub organizations: Vec<ImportedOrganization>,
    pub participants: Vec<ImportedSessionParticipant>,
    pub templates: Vec<ImportedTemplate>,
}

impl ImportResult {
    pub fn stats(&self) -> ImportStats {
        ImportStats {
            organizations_count: self.organizations.len(),
            humans_count: self.humans.len(),
            notes_count: self.notes.len(),
            transcripts_count: self.transcripts.len(),
            participants_count: self.participants.len(),
            templates_count: self.templates.len(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct ImportedNote {
    pub id: String,
    pub title: String,
    pub content: String,
    pub raw_md: Option<String>,
    pub enhanced_content: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub folder_id: Option<String>,
    pub event_id: Option<String>,
    pub tags: Vec<String>,
    pub pre_meeting_memo: Option<String>,
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

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct ImportedTemplate {
    pub id: String,
    pub title: String,
    pub description: String,
    pub sections: Vec<ImportedTemplateSection>,
    pub tags: Vec<String>,
    pub context_option: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct ImportedTemplateSection {
    pub title: String,
    pub description: String,
}
