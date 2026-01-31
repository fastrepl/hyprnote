use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct Human {
    pub user_id: String,
    pub name: String,
    pub email: String,
    pub org_id: String,
    #[specta(optional)]
    pub job_title: Option<String>,
    #[specta(optional)]
    pub linkedin_username: Option<String>,
    #[specta(optional)]
    pub memo: Option<String>,
    /// @zod.default(false)
    pub pinned: bool,
    #[specta(optional)]
    pub pin_order: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct Event {
    pub user_id: String,
    pub created_at: String,
    pub tracking_id_event: String,
    pub calendar_id: String,
    pub title: String,
    pub started_at: String,
    pub ended_at: String,
    #[specta(optional)]
    pub location: Option<String>,
    #[specta(optional)]
    pub meeting_link: Option<String>,
    #[specta(optional)]
    pub description: Option<String>,
    #[specta(optional)]
    pub note: Option<String>,
    #[specta(optional)]
    pub ignored: Option<bool>,
    #[specta(optional)]
    pub recurrence_series_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct Calendar {
    pub user_id: String,
    pub created_at: String,
    pub tracking_id_calendar: String,
    pub name: String,
    /// @zod.default(false)
    pub enabled: bool,
    /// @zod.schema(calendarProviderSchema)
    pub provider: String,
    #[specta(optional)]
    pub source: Option<String>,
    #[specta(optional)]
    pub color: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct Organization {
    pub user_id: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct Session {
    pub user_id: String,
    pub created_at: String,
    #[specta(optional)]
    pub folder_id: Option<String>,
    #[specta(optional)]
    pub event_id: Option<String>,
    pub title: String,
    pub raw_md: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct Transcript {
    pub user_id: String,
    pub created_at: String,
    pub session_id: String,
    pub started_at: i64,
    #[specta(optional)]
    pub ended_at: Option<i64>,
    /// @zod.default("[]")
    pub words: String,
    /// @zod.default("[]")
    pub speaker_hints: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct MappingSessionParticipant {
    pub user_id: String,
    pub session_id: String,
    pub human_id: String,
    /// @zod.schema(participantSourceSchema.optional())
    #[specta(optional)]
    pub source: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct Tag {
    pub user_id: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct MappingTagSession {
    pub user_id: String,
    pub tag_id: String,
    pub session_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct Template {
    pub user_id: String,
    pub title: String,
    pub description: String,
    #[specta(optional)]
    pub category: Option<String>,
    #[specta(optional)]
    pub targets: Option<Vec<String>>,
    pub sections: Vec<TemplateSection>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct TemplateSection {
    pub title: String,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ChatGroup {
    pub user_id: String,
    pub created_at: String,
    pub title: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ChatMessage {
    pub user_id: String,
    pub created_at: String,
    pub chat_group_id: String,
    pub role: String,
    pub content: String,
    /// @zod.json(z.any())
    pub metadata: String,
    /// @zod.json(z.any())
    pub parts: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ChatShortcut {
    pub user_id: String,
    pub title: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct EnhancedNote {
    pub user_id: String,
    pub session_id: String,
    pub content: String,
    #[specta(optional)]
    pub template_id: Option<String>,
    pub position: i32,
    #[specta(optional)]
    pub title: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct Prompt {
    pub user_id: String,
    pub task_type: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct Word {
    pub user_id: String,
    pub created_at: String,
    pub transcript_id: String,
    pub text: String,
    pub start_ms: i64,
    pub end_ms: i64,
    pub channel: i32,
    #[specta(optional)]
    pub speaker: Option<String>,
    /// @zod.json(z.record(z.string(), z.unknown()))
    #[specta(optional)]
    pub metadata: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SpeakerHint {
    pub user_id: String,
    pub created_at: String,
    pub transcript_id: String,
    pub word_id: String,
    pub r#type: String,
    /// @zod.json(z.record(z.string(), z.unknown()))
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct General {
    pub user_id: String,
    /// @zod.default(false)
    pub autostart: bool,
    /// @zod.default(true)
    pub telemetry_consent: bool,
    /// @zod.default(true)
    pub save_recordings: bool,
    /// @zod.default(true)
    pub notification_event: bool,
    /// @zod.default(true)
    pub notification_detect: bool,
    /// @zod.default(false)
    pub respect_dnd: bool,
    /// @zod.default(false)
    pub quit_intercept: bool,
    /// @zod.default("en")
    pub ai_language: String,
    /// @zod.default(["en"])
    pub spoken_languages: Vec<String>,
    /// @zod.default([])
    pub ignored_platforms: Vec<String>,
    /// @zod.default([])
    pub ignored_recurring_series: Vec<String>,
    #[specta(optional)]
    pub current_llm_provider: Option<String>,
    #[specta(optional)]
    pub current_llm_model: Option<String>,
    #[specta(optional)]
    pub current_stt_provider: Option<String>,
    #[specta(optional)]
    pub current_stt_model: Option<String>,
}
