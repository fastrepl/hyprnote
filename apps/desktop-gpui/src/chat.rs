//! The chat's pure logic, ported from `apps/desktop/src/chat`: the system
//! prompt guidance (`transport/use-transport.ts`), the UI message parts and
//! their persisted shapes (`store/persisted-messages.ts`), the model
//! message window (`transport/helpers.ts`), the context block over the
//! session snapshot (`context/session-context-hydrator.ts`), the chat title
//! helpers (`store/chat-title.ts`), and the empty state's suggestions.

use serde::{Deserialize, Serialize};

pub const MEETING_CONTEXT_TOOL_GUIDANCE: &str = "Context and local meeting tool guidance:
- Use list_meetings for recent meetings, title or ID lookup, pagination, and exact recurring-series filtering. Never guess a meeting ID.
- Use search_meetings for open-ended questions about topics, people, decisions, or date ranges across meeting content. Use search_meeting_content when the user needs exact wording from notes or transcripts.
- After resolving an ID, use get_meeting for the canonical note, summaries, participants, and action items. Use get_meeting_transcript separately for bounded transcript pages, following pagination.next_offset only when more context is needed.
- Use get_recurring_meeting_history for meetings in the same recurring series. Use find_related_meetings only for broader relationships such as shared participants or nearby dates.
- When the user refers to the current meeting, prefer the attached meeting context. Do not fetch it again unless the task needs newer structured data.
- When folder context is attached, prefer the notes listed in that folder and follow any folder instructions. Search and content tools stay scoped to that folder. Use read_folder_material for syllabus or other folder files listed in that context. PDF text is extracted when available.
- When the user asks to prepare for a meeting, create an agenda, organize talking points, or add drafted content before or during a meeting, call edit_memo with the complete replacement markdown so they can review and apply it. Preserve relevant existing memo content. Use edit_memo even when the memo is empty; do not use edit_summary for meeting preparation.
- When the user asks to rewrite, revise, refocus, shorten, or restructure an existing summary, call edit_summary with the complete replacement markdown so they can review and apply it. Do not return the rewrite only as a fenced markdown block.
- Use edit_summary only for existing generated post-meeting summaries. Use apply_session_correction for narrow exact old-to-new corrections and edit_summary for broader summary rewrites. Only return a draft without calling edit_memo or edit_summary when the user explicitly asks not to change the meeting content or no target session can be resolved.
- When the user corrects note content with wording like \"it's not X but Y\", use apply_session_correction to update the current session summary, visible session title, and transcript unless they explicitly ask for one target only. Add uncommon names, companies, products, acronyms, or jargon from the correction to dictionaryTerms so future transcription and summaries can prefer them; skip common names. If the tool reports partial, use get_meeting or retry with the exact remaining text instead of claiming both were updated.
- When the user asks to move a recording, transcript, or notes onto a different existing meeting, resolve both meeting IDs with list_meetings or search_meetings, then call move_meeting_contents. Default the source to the current meeting when they are looking at the misplaced recording. Do not guess IDs. If the target already has a recording or transcript, explain that and stop.
- Do not ask the user to open or share a meeting until list_meetings, search_meetings, search_meeting_content, and get_meeting cannot find enough local context.
- Use typed meeting tools instead of constructing shell commands, crawling files, or accessing SQLite directly.
- Do not assume meeting contents from chat history when a typed tool can read the current source of truth.

Web search guidance:
- Use web_search for public websites, URLs, companies, products, people, news, or current facts that may be outside local notes.
- Include source URLs in the final answer when web_search results are used.
- Do not use web_search for questions that only need local notes, contacts, or calendar events.";

/// `appendMeetingContextToolGuidance(prompt)`
pub fn append_meeting_context_tool_guidance(prompt: &str) -> String {
    if prompt.trim().is_empty() {
        return MEETING_CONTEXT_TOOL_GUIDANCE.to_string();
    }
    format!("{}\n\n{MEETING_CONTEXT_TOOL_GUIDANCE}", prompt.trim())
}

/// `prepareStep`: past `MESSAGE_WINDOW_THRESHOLD` model messages only the
/// last `MESSAGE_WINDOW_SIZE` go to the model.
pub const MESSAGE_WINDOW_THRESHOLD: usize = 20;
pub const MESSAGE_WINDOW_SIZE: usize = 10;

pub fn window_messages<T>(messages: Vec<T>) -> Vec<T> {
    if messages.len() > MESSAGE_WINDOW_THRESHOLD {
        let skip = messages.len() - MESSAGE_WINDOW_SIZE;
        messages.into_iter().skip(skip).collect()
    } else {
        messages
    }
}

/// `ChatScope`
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Scope {
    General,
    Automations,
}

/// A `ContextRef` in the message metadata: the current note attached by
/// `use-chat-context-pipeline.ts` (`session:auto:<id>`, `auto-current`).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "lowercase")]
pub enum ContextRef {
    Session {
        key: String,
        source: String,
        #[serde(rename = "sessionId")]
        session_id: String,
    },
}

impl ContextRef {
    pub fn auto_session(session_id: &str) -> Self {
        Self::Session {
            key: format!("session:auto:{session_id}"),
            source: "auto-current".to_string(),
            session_id: session_id.to_string(),
        }
    }

    pub fn key(&self) -> &str {
        match self {
            Self::Session { key, .. } => key,
        }
    }
}

/// `AnlgUIMessage["metadata"]`
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct Metadata {
    #[serde(rename = "chatScope", default, skip_serializing_if = "Option::is_none")]
    pub chat_scope: Option<Scope>,
    #[serde(rename = "createdAt", default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<i64>,
    #[serde(
        rename = "contextRefs",
        default,
        skip_serializing_if = "Option::is_none"
    )]
    pub context_refs: Option<Vec<ContextRef>>,
}

/// The AI SDK `UIMessage` parts this shell reads and writes. Unknown parts
/// (tool calls written by the Tauri app) are kept verbatim.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum Part {
    #[serde(rename = "text")]
    Text {
        text: String,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        state: Option<String>,
    },
    #[serde(rename = "reasoning")]
    Reasoning {
        text: String,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        state: Option<String>,
    },
    #[serde(rename = "step-start")]
    StepStart,
    #[serde(untagged)]
    Other(serde_json::Value),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Role {
    User,
    Assistant,
}

/// `AnlgUIMessage`
#[derive(Debug, Clone, PartialEq)]
pub struct Message {
    pub id: String,
    pub role: Role,
    pub parts: Vec<Part>,
    pub metadata: Metadata,
    /// `PersistedChatMessage.status`
    pub status: Status,
}

/// `ChatMessageStatus`
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Status {
    Streaming,
    Ready,
    Error,
    Aborted,
}

impl Status {
    pub fn as_str(self) -> &'static str {
        match self {
            Status::Streaming => "streaming",
            Status::Ready => "ready",
            Status::Error => "error",
            Status::Aborted => "aborted",
        }
    }
}

/// `extractTextContent(parts)`: the text parts joined by blank lines.
pub fn extract_text_content(parts: &[Part]) -> String {
    parts
        .iter()
        .filter_map(|part| match part {
            Part::Text { text, .. } => Some(text.as_str()),
            _ => None,
        })
        .collect::<Vec<_>>()
        .join("\n\n")
}

/// The row shape of `chat_messages` (`ChatMessageRecord`).
#[derive(Debug, Clone, PartialEq, sqlx::FromRow)]
pub struct MessageRow {
    pub id: String,
    pub chat_group_id: String,
    pub owner_user_id: String,
    pub role: String,
    pub content: String,
    pub metadata_json: String,
    pub parts_json: String,
    pub status: String,
    pub created_at: String,
}

impl MessageRow {
    /// `buildPersistedChatMessage`: `createdAt` from the metadata's epoch
    /// millis, else now.
    pub fn from_message(
        message: &Message,
        chat_group_id: &str,
        owner_user_id: &str,
        content: Option<String>,
    ) -> Self {
        let created_at = message
            .metadata
            .created_at
            .and_then(chrono::DateTime::<chrono::Utc>::from_timestamp_millis)
            .unwrap_or_else(chrono::Utc::now)
            .format("%Y-%m-%dT%H:%M:%S%.3fZ")
            .to_string();
        Self {
            id: message.id.clone(),
            chat_group_id: chat_group_id.to_string(),
            owner_user_id: owner_user_id.to_string(),
            role: match message.role {
                Role::User => "user".into(),
                Role::Assistant => "assistant".into(),
            },
            content: content.unwrap_or_else(|| extract_text_content(&message.parts)),
            metadata_json: serde_json::to_string(&message.metadata).unwrap_or_else(|_| "{}".into()),
            parts_json: serde_json::to_string(&message.parts).unwrap_or_else(|_| "[]".into()),
            status: message.status.as_str().to_string(),
            created_at,
        }
    }

    /// `rowToPersistedChatMessage`: unknown roles and bad JSON fall back like
    /// the frontend's `parseJson` defaults.
    pub fn into_message(self) -> Option<Message> {
        let role = match self.role.as_str() {
            "user" => Role::User,
            "assistant" => Role::Assistant,
            _ => return None,
        };
        Some(Message {
            id: self.id,
            role,
            parts: serde_json::from_str(&self.parts_json).unwrap_or_default(),
            metadata: serde_json::from_str(&self.metadata_json).unwrap_or_default(),
            status: match self.status.as_str() {
                "streaming" => Status::Streaming,
                "error" => Status::Error,
                "aborted" => Status::Aborted,
                _ => Status::Ready,
            },
        })
    }
}

/// `ChatGroupRecord`
#[derive(Debug, Clone, PartialEq, sqlx::FromRow)]
pub struct GroupRow {
    pub id: String,
    pub owner_user_id: String,
    pub title: String,
    pub created_at: String,
    pub updated_at: String,
}

const FALLBACK_CHAT_TITLE_MAX_LENGTH: usize = 50;
const GENERATED_CHAT_TITLE_MAX_LENGTH: usize = 60;
pub const INITIAL_REQUEST_MAX_LENGTH: usize = 4000;

/// `generateChatTitle`'s system prompt.
pub const TITLE_SYSTEM_PROMPT: &str = "Write a concise chat title from the user's first message. Use the same language as the request. Return only the title, with no quotes, emoji, markdown, or ending punctuation. Keep it under 6 words.";

/// `createFallbackChatTitle(initialRequest)`
pub fn create_fallback_chat_title(initial_request: &str) -> String {
    let title = normalize_title_text(initial_request);
    if title.is_empty() {
        return "New chat".to_string();
    }
    truncate_title(&title, FALLBACK_CHAT_TITLE_MAX_LENGTH)
}

/// The `Initial request:` prompt for the title model, capped like
/// `INITIAL_REQUEST_MAX_LENGTH`; `None` when there is nothing to title.
pub fn title_request(initial_request: &str) -> Option<String> {
    let request: String = normalize_title_text(initial_request)
        .chars()
        .take(INITIAL_REQUEST_MAX_LENGTH)
        .collect();
    (!request.is_empty()).then(|| format!("Initial request:\n{request}"))
}

/// `normalizeGeneratedChatTitle(text)`
pub fn normalize_generated_chat_title(text: &str) -> Option<String> {
    let first_line = text.lines().map(str::trim).find(|line| !line.is_empty())?;
    let mut title = normalize_title_text(first_line);
    // `^\d+[.)]\s*`
    let digits = title.chars().take_while(|c| c.is_ascii_digit()).count();
    if digits > 0 && matches!(title[digits..].chars().next(), Some('.') | Some(')')) {
        title = title[digits + 1..].trim_start().to_string();
    }
    // `^[-*#]\s*`
    if let Some(rest) = title.strip_prefix(['-', '*', '#']) {
        title = rest.trim_start().to_string();
    }
    let title = title
        .trim_start_matches(['"', '\'', '`'])
        .trim_end_matches(['"', '\'', '`'])
        .trim_end_matches(['.', '!', '?'])
        .trim();
    if title.is_empty() {
        return None;
    }
    Some(truncate_title(title, GENERATED_CHAT_TITLE_MAX_LENGTH))
}

/// `normalizeTitleText`
fn normalize_title_text(text: &str) -> String {
    text.split_whitespace().collect::<Vec<_>>().join(" ")
}

/// `truncateTitle`: cut to `max_length - 3` characters, back to the last
/// space when it sits past the middle, then `...`.
fn truncate_title(title: &str, max_length: usize) -> String {
    let chars: Vec<char> = title.chars().collect();
    if chars.len() <= max_length {
        return title.to_string();
    }
    let truncated: String = chars[..max_length - 3].iter().collect();
    let truncated = truncated.trim_end();
    let prefix = match truncated.rfind(' ') {
        Some(last_space) if truncated[..last_space].chars().count() > max_length / 2 => {
            &truncated[..last_space]
        }
        _ => truncated,
    };
    format!("{prefix}...")
}

/// `body/empty.tsx`'s suggestions when a model and the current note exist:
/// the label shown and the prompt sent.
pub const SUGGESTIONS: [(&str, &str); 3] = [
    (
        "List action items.",
        "What are my action items from this meeting?",
    ),
    (
        "Draft follow-up email.",
        "Draft a follow-up email to the participants",
    ),
    (
        "Find key decisions.",
        "What were the key decisions that have been made?",
    ),
];

/// `hydrateSessionContext(sessionId)` over the enhancer's content snapshot:
/// the `SessionContext` the `ContextBlock` template renders.
pub fn session_context(
    snapshot: &crate::enhancer::Snapshot,
    created_at: Option<&str>,
    meeting_chat: Option<&str>,
) -> anlg_template_app::SessionContext {
    let enhanced: Vec<String> = snapshot
        .enhanced_notes
        .iter()
        .filter_map(|note| {
            let markdown =
                crate::db::enhancer::body_to_markdown(&note.content, &note.content_format);
            (!markdown.trim().is_empty()).then_some(markdown)
        })
        .collect();
    let transcript = (!snapshot.transcripts.is_empty()).then(|| anlg_template_app::Transcript {
        segments: snapshot
            .segments
            .iter()
            .map(|segment| anlg_template_app::Segment {
                text: segment.text.clone(),
                speaker: segment.speaker_label.clone(),
            })
            .collect(),
        started_at: snapshot
            .transcripts
            .iter()
            .map(|transcript| transcript.started_at)
            .min()
            .map(|value| value.max(0) as u64),
        ended_at: snapshot
            .transcripts
            .iter()
            .filter_map(|transcript| transcript.ended_at)
            .max()
            .map(|value| value.max(0) as u64),
    });
    let event_name = serde_json::from_str::<serde_json::Value>(&snapshot.event_json)
        .ok()
        .and_then(|event| {
            ["name", "title"]
                .iter()
                .find_map(|key| {
                    event
                        .get(key)
                        .and_then(|v| v.as_str())
                        .filter(|v| !v.is_empty())
                })
                .map(str::to_string)
        });
    anlg_template_app::SessionContext {
        title: Some(snapshot.title.clone()).filter(|title| !title.is_empty()),
        date: created_at
            .map(str::to_string)
            .filter(|date| !date.is_empty()),
        raw_content: Some(snapshot.raw_markdown.clone()).filter(|md| !md.is_empty()),
        enhanced_content: (!enhanced.is_empty()).then(|| enhanced.join("\n\n---\n\n")),
        meeting_chat: meeting_chat
            .map(str::to_string)
            .filter(|chat| !chat.is_empty()),
        transcript,
        participants: snapshot
            .participants
            .iter()
            .filter(|participant| !participant.name.is_empty())
            .map(|participant| anlg_template_app::Participant {
                name: participant.name.clone(),
                job_title: Some(participant.job_title.clone()).filter(|title| !title.is_empty()),
            })
            .collect(),
        event: event_name.map(|name| anlg_template_app::Event { name }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn guidance_is_appended_after_a_blank_line() {
        assert_eq!(
            append_meeting_context_tool_guidance(" prompt \n"),
            format!("prompt\n\n{MEETING_CONTEXT_TOOL_GUIDANCE}")
        );
        assert_eq!(
            append_meeting_context_tool_guidance("  "),
            MEETING_CONTEXT_TOOL_GUIDANCE
        );
        assert!(
            MEETING_CONTEXT_TOOL_GUIDANCE.starts_with("Context and local meeting tool guidance:")
        );
        assert!(MEETING_CONTEXT_TOOL_GUIDANCE.ends_with("contacts, or calendar events."));
    }

    #[test]
    fn windowing_keeps_the_last_ten_past_twenty() {
        let messages: Vec<usize> = (0..21).collect();
        assert_eq!(window_messages(messages), (11..21).collect::<Vec<_>>());
        let messages: Vec<usize> = (0..20).collect();
        assert_eq!(window_messages(messages.clone()), messages);
    }

    #[test]
    fn fallback_titles_follow_create_fallback_chat_title() {
        assert_eq!(create_fallback_chat_title("   "), "New chat");
        assert_eq!(
            create_fallback_chat_title("  What   are\nmy tasks? "),
            "What are my tasks?"
        );
        let long = "word ".repeat(20);
        let title = create_fallback_chat_title(&long);
        assert!(title.ends_with("..."));
        assert!(title.chars().count() <= 50);
        assert_eq!(title, "word word word word word word word word word...");
        // A long single token cuts mid-word.
        assert_eq!(
            create_fallback_chat_title(&"a".repeat(60)),
            format!("{}...", "a".repeat(47))
        );
    }

    #[test]
    fn generated_titles_are_normalised() {
        assert_eq!(
            normalize_generated_chat_title("\n\n 1. \"Action items for Monday.\" \n"),
            Some("Action items for Monday".to_string())
        );
        assert_eq!(
            normalize_generated_chat_title("- Follow-up email!"),
            Some("Follow-up email".to_string())
        );
        assert_eq!(
            normalize_generated_chat_title("# Key decisions?\nsecond line"),
            Some("Key decisions".to_string())
        );
        assert_eq!(normalize_generated_chat_title("   \n"), None);
        assert_eq!(normalize_generated_chat_title("\"...\""), None);
        assert_eq!(
            title_request("  hello   world "),
            Some("Initial request:\nhello world".into())
        );
        assert_eq!(title_request(" "), None);
    }

    #[test]
    fn message_rows_round_trip_with_the_frontend_shapes() {
        let message = Message {
            id: "m1".into(),
            role: Role::User,
            parts: vec![Part::Text {
                text: "Hi".into(),
                state: None,
            }],
            metadata: Metadata {
                chat_scope: Some(Scope::General),
                created_at: Some(1_700_000_000_000),
                context_refs: Some(vec![ContextRef::auto_session("s1")]),
            },
            status: Status::Ready,
        };
        let row = MessageRow::from_message(&message, "g1", "u1", None);
        assert_eq!(row.content, "Hi");
        assert_eq!(row.created_at, "2023-11-14T22:13:20.000Z");
        assert_eq!(
            row.metadata_json,
            r#"{"chatScope":"general","createdAt":1700000000000,"contextRefs":[{"kind":"session","key":"session:auto:s1","source":"auto-current","sessionId":"s1"}]}"#
        );
        assert_eq!(row.parts_json, r#"[{"type":"text","text":"Hi"}]"#);
        assert_eq!(row.clone().into_message(), Some(message));
        // Unknown parts survive untouched.
        let tool = MessageRow {
            parts_json: r#"[{"type":"step-start"},{"type":"tool-search_meetings","state":"output-available","input":{}}]"#.into(),
            role: "assistant".into(),
            status: "ready".into(),
            ..row
        };
        let parsed = tool.into_message().unwrap();
        assert_eq!(parsed.parts.len(), 2);
        assert_eq!(parsed.parts[0], Part::StepStart);
        assert!(matches!(parsed.parts[1], Part::Other(_)));
        assert_eq!(
            serde_json::to_string(&parsed.parts[1]).unwrap(),
            r#"{"type":"tool-search_meetings","state":"output-available","input":{}}"#
        );
    }
}
