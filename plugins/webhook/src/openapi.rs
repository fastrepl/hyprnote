use serde::{Deserialize, Serialize};

use utoipa::{
    openapi::security::{ApiKey, ApiKeyValue, SecurityScheme},
    Modify, OpenApi, ToSchema,
};

// Webhook event types that we send to external systems
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct WebhookEvent {
    /// Unique identifier for this webhook event
    #[schema(example = "evt_01234567890")]
    pub id: String,

    /// Type of the webhook event
    #[schema(example = "note.created")]
    pub event_type: WebhookEventType,

    /// ISO 8601 timestamp when the event occurred
    #[schema(example = "2024-01-10T10:30:00Z")]
    pub timestamp: String,

    /// Version of the webhook API
    #[schema(example = "1.0")]
    pub api_version: String,

    /// The actual event data
    pub data: WebhookEventData,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum WebhookEventType {
    /// Triggered when a new note is created
    NoteCreated,
    /// Triggered when a note is updated
    NoteUpdated,
    /// Triggered when a note is deleted
    NoteDeleted,
    /// Triggered when a recording starts
    RecordingStarted,
    /// Triggered when a recording completes
    RecordingCompleted,
    /// Triggered when transcription is ready
    TranscriptionReady,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(untagged)]
pub enum WebhookEventData {
    Note(NoteEventData),
    Recording(RecordingEventData),
    Transcription(TranscriptionEventData),
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct NoteEventData {
    /// Unique identifier of the note
    #[schema(example = "note_abc123")]
    pub note_id: String,

    /// Title of the note
    #[schema(example = "Meeting Notes - Q1 Planning")]
    pub title: String,

    /// Content of the note (may be truncated for large notes)
    #[schema(example = "Today we discussed...")]
    pub content: Option<String>,

    /// Tags associated with the note
    #[schema(example = json!(["meeting", "planning", "q1"]))]
    pub tags: Vec<String>,

    /// ISO 8601 timestamp when the note was created
    #[schema(example = "2024-01-10T10:00:00Z")]
    pub created_at: String,

    /// ISO 8601 timestamp when the note was last updated
    #[schema(example = "2024-01-10T10:30:00Z")]
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct RecordingEventData {
    /// Unique identifier of the recording
    #[schema(example = "rec_xyz789")]
    pub recording_id: String,

    /// Duration of the recording in seconds
    #[schema(example = 300)]
    pub duration_seconds: Option<u32>,

    /// File size in bytes
    #[schema(example = 1048576)]
    pub file_size_bytes: Option<u64>,

    /// Status of the recording
    #[schema(example = "completed")]
    pub status: RecordingStatus,

    /// ISO 8601 timestamp when recording started
    #[schema(example = "2024-01-10T10:00:00Z")]
    pub started_at: String,

    /// ISO 8601 timestamp when recording completed
    #[schema(example = "2024-01-10T10:05:00Z")]
    pub completed_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum RecordingStatus {
    Started,
    InProgress,
    Completed,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct TranscriptionEventData {
    /// ID of the recording that was transcribed
    #[schema(example = "rec_xyz789")]
    pub recording_id: String,

    /// ID of the transcription
    #[schema(example = "trans_qwe456")]
    pub transcription_id: String,

    /// Transcribed text
    #[schema(example = "Hello, this is the transcribed text from the recording.")]
    pub text: String,

    /// Language detected in the transcription
    #[schema(example = "en")]
    pub language: Option<String>,

    /// Confidence score of the transcription (0.0 to 1.0)
    #[schema(example = 0.95)]
    pub confidence: Option<f32>,

    /// Duration in milliseconds to complete transcription
    #[schema(example = 1500)]
    pub processing_time_ms: u32,
}

// Webhook request/response types
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct WebhookDeliveryRequest {
    /// The webhook event being delivered
    pub event: WebhookEvent,

    /// Signature for webhook verification (HMAC-SHA256)
    #[schema(example = "sha256=abcdef1234567890")]
    pub signature: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct WebhookDeliveryResponse {
    /// Whether the webhook was successfully processed
    pub success: bool,

    /// Optional message from the receiver
    pub message: Option<String>,
}

#[derive(OpenApi)]
#[openapi(
    info(
        title = "Hyprnote Webhook API",
        version = "1.0.0",
        description = "Webhook events sent by Hyprnote to external systems",
        contact(
            name = "Hyprnote Team",
            email = "support@hyprnote.com",
            url = "https://hyprnote.com"
        ),
        license(
            name = "MIT",
            url = "https://opensource.org/licenses/MIT"
        )
    ),
    servers(
        (url = "https://your-server.example.com", description = "Your webhook endpoint")
    ),
    components(
        schemas(
            WebhookEvent,
            WebhookEventType,
            WebhookEventData,
            NoteEventData,
            RecordingEventData,
            RecordingStatus,
            TranscriptionEventData,
            WebhookDeliveryRequest,
            WebhookDeliveryResponse
        )
    ),
    modifiers(&SecurityAddon),
    external_docs(
        url = "https://docs.hyprnote.com/webhooks",
        description = "More information about Hyprnote webhooks"
    )
)]
pub struct ApiDoc;

struct SecurityAddon;

impl Modify for SecurityAddon {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        if let Some(components) = openapi.components.as_mut() {
            components.add_security_scheme(
                "webhook_signature",
                SecurityScheme::ApiKey(ApiKey::Header(ApiKeyValue::new("X-Webhook-Signature"))),
            );
        }
    }
}

pub fn generate_openapi_json() -> String {
    ApiDoc::openapi().to_pretty_json().unwrap()
}
