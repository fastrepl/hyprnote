use serde::{Deserialize, Serialize};

#[derive(Debug, Default)]
pub struct MigrationData {
    pub sessions: Vec<Session>,
    pub transcripts: Vec<Transcript>,
    pub humans: Vec<Human>,
    pub organizations: Vec<Organization>,
    pub participants: Vec<SessionParticipant>,
    pub templates: Vec<Template>,
    pub enhanced_notes: Vec<EnhancedNote>,
    pub tags: Vec<Tag>,
    pub tag_mappings: Vec<TagMapping>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub id: String,
    #[serde(default)]
    pub user_id: String,
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub raw_md: Option<String>,
    #[serde(default)]
    pub folder_id: Option<String>,
    #[serde(default)]
    pub event_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Transcript {
    pub id: String,
    #[serde(default)]
    pub user_id: String,
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub session_id: String,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub started_at: f64,
    #[serde(default)]
    pub ended_at: Option<f64>,
    #[serde(default)]
    pub start_ms: Option<f64>,
    #[serde(default)]
    pub end_ms: Option<f64>,
    #[serde(default)]
    pub words: Vec<Word>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Word {
    pub id: String,
    #[serde(default)]
    pub text: String,
    #[serde(default)]
    pub start_ms: Option<f64>,
    #[serde(default)]
    pub end_ms: Option<f64>,
    #[serde(default)]
    pub channel: i64,
    #[serde(default)]
    pub speaker: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Human {
    pub id: String,
    #[serde(default)]
    pub user_id: String,
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub email: Option<String>,
    #[serde(default)]
    pub org_id: Option<String>,
    #[serde(default)]
    pub job_title: Option<String>,
    #[serde(default)]
    pub linkedin_username: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Organization {
    pub id: String,
    #[serde(default)]
    pub user_id: String,
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionParticipant {
    pub id: String,
    #[serde(default)]
    pub user_id: String,
    #[serde(default)]
    pub session_id: String,
    #[serde(default)]
    pub human_id: String,
    #[serde(default)]
    pub source: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Template {
    pub id: String,
    #[serde(default)]
    pub user_id: String,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub sections: Vec<TemplateSection>,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub context_option: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateSection {
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnhancedNote {
    pub id: String,
    #[serde(default)]
    pub user_id: String,
    #[serde(default)]
    pub session_id: String,
    #[serde(default)]
    pub content: String,
    #[serde(default)]
    pub template_id: Option<String>,
    #[serde(default)]
    pub position: i32,
    #[serde(default)]
    pub title: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tag {
    pub id: String,
    #[serde(default)]
    pub user_id: String,
    #[serde(default)]
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TagMapping {
    pub id: String,
    #[serde(default)]
    pub user_id: String,
    #[serde(default)]
    pub tag_id: String,
    #[serde(default)]
    pub session_id: String,
}
