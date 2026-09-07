//! The `chat-general` tool registry (`apps/desktop/src/chat/tools/index.ts`):
//! the fifteen tool schemas the Tauri app advertises, verbatim, and the local
//! implementations behind them — the `agent-access` meeting tools, the
//! search-index / SQL searches, and the signed-out answers of the hosted
//! ones. Tools that need surfaces the shell does not have yet fail with an
//! explicit error the model (and the tool card) can see.

use std::sync::{Arc, OnceLock};

use serde_json::{Value, json};
use sqlx::SqlitePool;

use crate::llm_stream::ToolSpec;

const SPECS_JSON: &str = include_str!("chat_tools.json");

/// `stepCountIs(MAX_TOOL_STEPS)`
pub const MAX_TOOL_STEPS: usize = 5;

/// `CONTEXT_TEXT_FIELD`: the hydrated session context `search_meetings`
/// outputs carry to the model and the UI strips.
pub const CONTEXT_TEXT_FIELD: &str = "contextText";

/// The tools in the order the Tauri app lists them.
pub fn specs() -> &'static [ToolSpec] {
    static SPECS: OnceLock<Vec<ToolSpec>> = OnceLock::new();
    SPECS.get_or_init(|| {
        let tools: Vec<Value> = serde_json::from_str(SPECS_JSON).expect("valid tool schemas");
        tools
            .into_iter()
            .filter_map(|tool| {
                let function = tool.get("function")?;
                Some(ToolSpec {
                    name: function.get("name")?.as_str()?.to_string(),
                    description: function.get("description")?.as_str()?.to_string(),
                    parameters: function.get("parameters")?.clone(),
                })
            })
            .collect()
    })
}

/// `ToolDependencies`' per-call state.
#[derive(Debug, Clone, Default)]
pub struct Context {
    /// `getSessionId()`: the note the chat is open on.
    pub session_id: Option<String>,
    /// `getFolderFilter()`: the folder the sidebar is filtered to.
    pub folder_filter: Option<String>,
    /// `isSessionBusy`: sessions recording, finalizing, or batch transcribing.
    pub busy_sessions: Vec<String>,
}

/// Everything a tool run needs.
pub struct Runner {
    pub store: Arc<crate::db::Store>,
    pub search: Option<Arc<crate::search::SearchIndex>>,
}

impl Runner {
    fn pool(&self) -> &SqlitePool {
        self.store.pool()
    }

    /// Execute one tool on the Tokio runtime (sqlx needs its context);
    /// `Err` becomes the part's `output-error`.
    pub fn run(
        self: &Arc<Self>,
        ctx: Context,
        name: String,
        input: Value,
    ) -> tokio::task::JoinHandle<Result<Value, String>> {
        let runner = self.clone();
        self.store
            .runtime()
            .spawn(async move { runner.execute(&ctx, &name, input).await })
    }

    async fn execute(&self, ctx: &Context, name: &str, input: Value) -> Result<Value, String> {
        match name {
            "list_meetings" => {
                let input = parse_input(input)?;
                anlg_agent_access::list_meetings(self.pool(), input)
                    .await
                    .map_err(|error| error.to_string())
                    .and_then(to_value)
            }
            "get_meeting" => {
                let input = parse_input(input)?;
                anlg_agent_access::get_meeting(self.pool(), input)
                    .await
                    .map_err(|error| error.to_string())
                    .and_then(to_value)
            }
            "get_meeting_transcript" => {
                let input = parse_input(input)?;
                anlg_agent_access::get_meeting_transcript(self.pool(), input)
                    .await
                    .map_err(|error| error.to_string())
                    .and_then(to_value)
            }
            "get_recurring_meeting_history" => {
                let input = parse_input(input)?;
                anlg_agent_access::get_recurring_meeting_history(self.pool(), input)
                    .await
                    .map_err(|error| error.to_string())
                    .and_then(to_value)
            }
            "search_meeting_content" => self.search_meeting_content(ctx, &input).await,
            "find_related_meetings" => self.find_related_meetings(ctx, &input).await,
            "search_meetings" => self.search_meetings(ctx, &input).await,
            "search_contacts" => self.search_contacts(&input).await,
            "search_calendar_events" => self.search_calendar_events(&input).await,
            "web_search" => Ok(json!({
                "status": "error",
                "message": "Sign in to use web search.",
                "query": input.get("query").cloned().unwrap_or(Value::Null),
                "results": []
            })),
            "move_meeting_contents" => {
                let source = input
                    .get("sourceMeetingId")
                    .and_then(|id| id.as_str())
                    .map(str::to_string)
                    .or_else(|| ctx.session_id.clone());
                let target = input
                    .get("targetMeetingId")
                    .and_then(|id| id.as_str())
                    .unwrap_or_default()
                    .to_string();
                let Some(source) = source else {
                    return Ok(json!({
                        "status": "error",
                        "message": "No source meeting selected. Provide sourceMeetingId explicitly when calling move_meeting_contents."
                    }));
                };
                let busy =
                    ctx.busy_sessions.contains(&source) || ctx.busy_sessions.contains(&target);
                self.store
                    .move_session_contents(source, target, busy)
                    .await
                    .map_err(|error| error.to_string())
            }
            "read_folder_material" | "edit_memo" | "edit_summary" | "apply_session_correction" => {
                Err(format!("{name} is not available in the native shell yet."))
            }
            other => Err(format!("Unknown tool: {other}")),
        }
    }

    /// `searchContacts(query, limit)` → `{ query, results }`.
    async fn search_contacts(&self, input: &Value) -> Result<Value, String> {
        let query = input
            .get("query")
            .and_then(|q| q.as_str())
            .unwrap_or_default();
        let limit = input.get("limit").and_then(|l| l.as_i64()).unwrap_or(8);
        let normalized = query.trim().to_lowercase();
        let rows: Vec<(String, String, String, String, String, String, String)> = sqlx::query_as(
            "
            SELECT
              humans.id,
              humans.name,
              humans.email,
              humans.phone,
              humans.job_title,
              COALESCE(organizations.name, '') AS organization_name,
              humans.memo
            FROM humans
            LEFT JOIN organizations
              ON organizations.id = humans.organization_id
              AND organizations.deleted_at IS NULL
            WHERE humans.deleted_at IS NULL
              AND (
                ? = '' OR lower(
                  humans.name || char(10) ||
                  humans.email || char(10) ||
                  humans.phone || char(10) ||
                  humans.job_title || char(10) ||
                  humans.memo || char(10) ||
                  COALESCE(organizations.name, '')
                ) LIKE '%' || ? || '%'
              )
            ORDER BY humans.created_at DESC, humans.id
            LIMIT ?
            ",
        )
        .bind(&normalized)
        .bind(&normalized)
        .bind(limit)
        .fetch_all(self.pool())
        .await
        .map_err(|error| error.to_string())?;
        let results: Vec<Value> = rows
            .into_iter()
            .map(|(id, name, email, phone, job_title, organization, memo)| {
                json!({
                    "id": id,
                    "name": name,
                    "email": non_empty(email),
                    "phone": non_empty(phone),
                    "jobTitle": non_empty(job_title),
                    "organization": non_empty(organization),
                    "memo": non_empty(memo)
                })
            })
            .collect();
        Ok(json!({ "query": query, "results": results }))
    }

    /// `searchCalendarEvents(query, limit)` → `{ query, results }`.
    async fn search_calendar_events(&self, input: &Value) -> Result<Value, String> {
        let query = input
            .get("query")
            .and_then(|q| q.as_str())
            .unwrap_or_default();
        let limit = input.get("limit").and_then(|l| l.as_i64()).unwrap_or(8);
        let normalized = query.trim().to_lowercase();
        let rows: Vec<CalendarEventRow> = sqlx::query_as(
            "
            SELECT
              event.id,
              event.title,
              event.started_at,
              event.ended_at,
              event.location,
              event.meeting_link,
              event.description,
              CASE
                WHEN json_valid(event.participants_json)
                  AND json_type(event.participants_json) = 'array'
                THEN json_array_length(event.participants_json)
                ELSE 0
              END AS participant_count,
              COALESCE((
                SELECT session.id
                FROM sessions AS session
                WHERE session.deleted_at IS NULL
                  AND (
                    session.event_id = event.id
                    OR (
                      event.tracking_id_event <> ''
                      AND session.external_event_id = event.tracking_id_event
                    )
                    OR (
                      json_valid(session.event_json)
                      AND json_extract(session.event_json, '$.tracking_id') =
                        event.tracking_id_event
                      AND json_extract(session.event_json, '$.calendar_id') =
                        event.calendar_id
                    )
                  )
                ORDER BY session.created_at, session.id
                LIMIT 1
              ), '') AS linked_session_id
            FROM events AS event
            WHERE event.deleted_at IS NULL
              AND (
                ? = ''
                OR instr(
                  lower(
                    event.title || char(10) ||
                    event.location || char(10) ||
                    event.meeting_link || char(10) ||
                    event.description
                  ),
                  ?
                ) > 0
              )
            ORDER BY julianday(event.started_at) DESC, event.id
            LIMIT ?
            ",
        )
        .bind(&normalized)
        .bind(&normalized)
        .bind(limit)
        .fetch_all(self.pool())
        .await
        .map_err(|error| error.to_string())?;
        let results: Vec<Value> = rows
            .into_iter()
            .map(
                |(
                    id,
                    title,
                    started_at,
                    ended_at,
                    location,
                    meeting_link,
                    description,
                    participant_count,
                    linked_session_id,
                )| {
                    json!({
                        "id": id,
                        "title": title,
                        "startedAt": non_empty(started_at),
                        "endedAt": non_empty(ended_at),
                        "location": non_empty(location),
                        "meetingLink": non_empty(meeting_link),
                        "description": non_empty(description),
                        "participantCount": participant_count,
                        "linkedSessionId": non_empty(linked_session_id)
                    })
                },
            )
            .collect();
        Ok(json!({ "query": query, "results": results }))
    }

    /// `buildSearchMeetingsTool`: the search index over meetings (or the
    /// folder's notes when the sidebar is filtered), `results[]` with the
    /// 180-character excerpt.
    async fn search_meetings(&self, ctx: &Context, input: &Value) -> Result<Value, String> {
        let query = input
            .get("query")
            .and_then(|q| q.as_str())
            .unwrap_or_default()
            .to_string();
        let limit = input.get("limit").and_then(|l| l.as_u64()).unwrap_or(5) as usize;
        let created_at = input
            .get("filters")
            .and_then(|f| f.get("created_at"))
            .and_then(created_at_filter);
        if let Some(folder) = &ctx.folder_filter {
            return self
                .search_folder_meetings(&query, folder, created_at.as_ref(), limit)
                .await;
        }
        let Some(index) = &self.search else {
            return Err("The search index is not ready yet.".to_string());
        };
        let hits = index
            .search_async(
                &query,
                anlg_search_index::SearchFilters {
                    created_at,
                    doc_type: None,
                    facet: None,
                },
            )
            .await
            .map_err(|error| error.to_string())?;
        let results: Vec<Value> = hits
            .into_iter()
            .filter(|hit| hit.document.doc_type == "session")
            .take(limit)
            .map(|hit| {
                json!({
                    "id": hit.document.id,
                    "title": hit.document.title,
                    "excerpt": hit.document.content.chars().take(180).collect::<String>(),
                    "score": hit.score,
                    "created_at": hit.document.created_at
                })
            })
            .collect();
        Ok(json!({ "results": results }))
    }

    /// `searchFolderMeetings`
    async fn search_folder_meetings(
        &self,
        query: &str,
        folder: &str,
        created_at: Option<&anlg_search_index::CreatedAtFilter>,
        limit: usize,
    ) -> Result<Value, String> {
        let sessions: Vec<(String, String, String, String)> = folder_sessions(self.pool(), folder)
            .await?
            .into_iter()
            .map(|(id, title, created, event_json)| (id, title, event_json, created))
            .collect();
        let sessions: Vec<(String, String, i64)> = sessions
            .into_iter()
            .map(|(id, title, event_json, created)| {
                (id, title, session_search_timestamp(&event_json, &created))
            })
            .filter(|(_, _, at)| matches_created_at(*at, created_at))
            .collect();
        if sessions.is_empty() {
            return Ok(json!({ "results": [] }));
        }
        if query.trim().is_empty() {
            let results: Vec<Value> = sessions
                .iter()
                .take(limit)
                .map(|(id, title, at)| {
                    json!({ "id": id, "title": title, "excerpt": "", "score": 0, "created_at": at })
                })
                .collect();
            return Ok(json!({ "results": results }));
        }
        let ids: Vec<String> = sessions.iter().map(|(id, _, _)| id.clone()).collect();
        let content = search_meeting_content(self.pool(), query, Some(&ids), limit).await?;
        let results: Vec<Value> = content
            .into_iter()
            .map(|m| {
                let created = sessions
                    .iter()
                    .find(|(id, _, _)| *id == m.session_id)
                    .map_or(0, |(_, _, at)| *at);
                json!({
                    "id": m.session_id,
                    "title": m.title,
                    "excerpt": m.snippets.first().map(|s| s.text.clone()).unwrap_or_default(),
                    "score": m.score,
                    "created_at": created
                })
            })
            .collect();
        Ok(json!({ "results": results }))
    }

    /// `buildSearchMeetingContentTool`
    async fn search_meeting_content(&self, ctx: &Context, input: &Value) -> Result<Value, String> {
        let query = input
            .get("query")
            .and_then(|q| q.as_str())
            .unwrap_or_default();
        let limit = input
            .get("limit")
            .and_then(|l| l.as_u64())
            .unwrap_or(DEFAULT_SEARCH_LIMIT as u64)
            .min(MAX_SEARCH_LIMIT as u64) as usize;
        let requested: Option<Vec<String>> = input
            .get("meeting_ids")
            .and_then(|ids| ids.as_array())
            .map(|ids| {
                ids.iter()
                    .filter_map(|id| id.as_str().map(str::to_string))
                    .collect()
            });
        let session_ids = match &ctx.folder_filter {
            None => requested,
            Some(folder) => {
                let folder_ids: Vec<String> = folder_sessions(self.pool(), folder)
                    .await?
                    .into_iter()
                    .map(|(id, _, _, _)| id)
                    .collect();
                match requested {
                    Some(ids) if !ids.is_empty() => Some(
                        ids.into_iter()
                            .filter(|id| folder_ids.contains(id))
                            .collect(),
                    ),
                    _ => Some(folder_ids),
                }
            }
        };
        let trimmed = query.trim();
        if trimmed.is_empty() {
            return Ok(json!({ "query": query, "results": [], "message": "Query is empty" }));
        }
        let candidates = match &session_ids {
            Some(ids) => ids.clone(),
            None => active_session_ids(self.pool()).await?,
        };
        let matches =
            search_meeting_content(self.pool(), trimmed, Some(&candidates), limit).await?;
        let results: Vec<Value> = matches
            .into_iter()
            .map(|m| {
                json!({
                    "title": m.title,
                    "date": m.date,
                    "score": m.score,
                    "snippets": m.snippets.iter().map(|s| json!({ "section": s.section, "text": s.text })).collect::<Vec<_>>(),
                    "meeting_id": m.session_id
                })
            })
            .collect();
        Ok(json!({ "query": trimmed, "scanned": candidates.len(), "results": results }))
    }

    /// `buildFindRelatedMeetingsTool`
    async fn find_related_meetings(&self, ctx: &Context, input: &Value) -> Result<Value, String> {
        let session_id = input
            .get("meeting_id")
            .and_then(|id| id.as_str())
            .map(str::to_string)
            .or_else(|| ctx.session_id.clone());
        let Some(session_id) = session_id else {
            return Ok(json!({
                "status": "error",
                "message": "No meeting is currently open",
                "results": []
            }));
        };
        let limit = input
            .get("limit")
            .and_then(|l| l.as_u64())
            .unwrap_or(DEFAULT_SEARCH_LIMIT as u64)
            .min(MAX_SEARCH_LIMIT as u64) as usize;
        let Some(base) = load_note_file(self.pool(), &session_id).await? else {
            return Ok(json!({
                "status": "error",
                "message": format!("Could not read note {session_id}"),
                "results": [],
                "meeting_id": session_id
            }));
        };
        let mut results: Vec<(i64, Value)> = Vec::new();
        for candidate_id in active_session_ids(self.pool()).await? {
            if candidate_id == session_id {
                continue;
            }
            let Some(candidate) = load_note_file(self.pool(), &candidate_id).await? else {
                continue;
            };
            let mut reasons: Vec<String> = Vec::new();
            let mut score: i64 = 0;
            if !base.event_id.is_empty() && candidate.event_id == base.event_id {
                reasons.push("same calendar event".to_string());
                score += 20;
            }
            let shared: Vec<String> = candidate
                .participants
                .iter()
                .filter(|(id, _)| base.participants.iter().any(|(b, _)| b == id))
                .map(|(_, name)| {
                    if name.is_empty() {
                        "shared participant".to_string()
                    } else {
                        format!("shared participant: {name}")
                    }
                })
                .collect();
            if !shared.is_empty() {
                score += shared.len() as i64 * 8;
                reasons.extend(shared);
            }
            if let Some(distance) = date_distance_days(&base.date, &candidate.date)
                && distance <= 7.0
            {
                reasons.push("nearby date".to_string());
                score += (7 - distance.floor() as i64).max(1);
            }
            if score > 0 {
                results.push((
                    score,
                    json!({
                        "title": candidate.title,
                        "date": candidate.date,
                        "score": score,
                        "reasons": reasons,
                        "meeting_id": candidate.session_id
                    }),
                ));
            }
        }
        results.sort_by(|a, b| b.0.cmp(&a.0));
        Ok(json!({
            "status": "ok",
            "title": base.title,
            "results": results.into_iter().take(limit).map(|(_, v)| v).collect::<Vec<_>>(),
            "meeting_id": session_id
        }))
    }
}

/// `CalendarEventSearchSqlRow`
type CalendarEventRow = (
    String,
    String,
    String,
    String,
    String,
    String,
    String,
    i64,
    String,
);

const DEFAULT_SEARCH_LIMIT: usize = 5;
const MAX_SEARCH_LIMIT: usize = 10;
const SNIPPET_RADIUS: usize = 180;

fn parse_input<T: serde::de::DeserializeOwned>(input: Value) -> Result<T, String> {
    serde_json::from_value(input).map_err(|error| format!("Invalid tool input: {error}"))
}

fn to_value<T: serde::Serialize>(value: T) -> Result<Value, String> {
    serde_json::to_value(value).map_err(|error| error.to_string())
}

fn non_empty(value: String) -> Value {
    if value.is_empty() {
        Value::Null
    } else {
        Value::String(value)
    }
}

/// `filters.created_at`: absolute bounds pass through, `relative`
/// becomes today's local end and `recent_days - 1` days before its start.
fn created_at_filter(filter: &Value) -> Option<anlg_search_index::CreatedAtFilter> {
    match filter.get("kind").and_then(|k| k.as_str()) {
        Some("absolute") => Some(anlg_search_index::CreatedAtFilter {
            gte: filter.get("gte").and_then(|v| v.as_f64()).map(|v| v as i64),
            lte: filter.get("lte").and_then(|v| v.as_f64()).map(|v| v as i64),
            gt: filter.get("gt").and_then(|v| v.as_f64()).map(|v| v as i64),
            lt: filter.get("lt").and_then(|v| v.as_f64()).map(|v| v as i64),
            eq: filter.get("eq").and_then(|v| v.as_f64()).map(|v| v as i64),
        }),
        Some("relative") => {
            let days = filter
                .get("recent_days")
                .and_then(|d| d.as_i64())
                .unwrap_or(1);
            Some(recent_days_filter(days, chrono::Local::now()))
        }
        _ => None,
    }
}

/// `getRecentDaysFilter(days)`
pub fn recent_days_filter(
    days: i64,
    now: chrono::DateTime<chrono::Local>,
) -> anlg_search_index::CreatedAtFilter {
    use chrono::TimeZone as _;
    let date = now.date_naive();
    let start_of_today = chrono::Local
        .from_local_datetime(&date.and_hms_opt(0, 0, 0).expect("midnight"))
        .single()
        .map(|t| t.timestamp_millis())
        .unwrap_or_else(|| now.timestamp_millis());
    let end_of_today = chrono::Local
        .from_local_datetime(&date.and_hms_milli_opt(23, 59, 59, 999).expect("end of day"))
        .single()
        .map(|t| t.timestamp_millis())
        .unwrap_or_else(|| now.timestamp_millis());
    anlg_search_index::CreatedAtFilter {
        gte: Some(start_of_today - (days - 1).max(0) * 24 * 60 * 60 * 1000),
        lte: Some(end_of_today),
        gt: None,
        lt: None,
        eq: None,
    }
}

/// `sessionMatchesCreatedAt`
pub fn matches_created_at(
    timestamp: i64,
    filter: Option<&anlg_search_index::CreatedAtFilter>,
) -> bool {
    let Some(filter) = filter else {
        return true;
    };
    if timestamp <= 0 {
        return false;
    }
    if filter.eq.is_some_and(|eq| timestamp != eq) {
        return false;
    }
    if filter.gte.is_some_and(|gte| timestamp < gte) {
        return false;
    }
    if filter.lte.is_some_and(|lte| timestamp > lte) {
        return false;
    }
    if filter.gt.is_some_and(|gt| timestamp <= gt) {
        return false;
    }
    if filter.lt.is_some_and(|lt| timestamp >= lt) {
        return false;
    }
    true
}

/// `sessionSearchTimestamp(event_json, created_at)`: the event's start when
/// it has one, else the session's creation, in epoch milliseconds.
pub fn session_search_timestamp(event_json: &str, created_at: &str) -> i64 {
    let from_event = serde_json::from_str::<Value>(event_json)
        .ok()
        .and_then(|event| event.get("started_at").cloned())
        .map(|value| to_epoch_ms(&value))
        .unwrap_or(0);
    if from_event > 0 {
        return from_event;
    }
    to_epoch_ms(&Value::String(created_at.to_string()))
}

fn to_epoch_ms(value: &Value) -> i64 {
    match value {
        Value::Number(number) => number.as_f64().map(|n| n.trunc() as i64).unwrap_or(0),
        Value::String(text) if !text.trim().is_empty() => {
            chrono::DateTime::parse_from_rfc3339(text.trim())
                .map(|t| t.timestamp_millis())
                .or_else(|_| {
                    chrono::NaiveDateTime::parse_from_str(text.trim(), "%Y-%m-%dT%H:%M:%S%.f")
                        .map(|t| t.and_utc().timestamp_millis())
                })
                .unwrap_or(0)
        }
        _ => 0,
    }
}

/// `loadSessionSummariesByFolder`: `(id, title, created_at, event_json)` of
/// the folder's sessions and its subfolders', newest first.
async fn folder_sessions(
    pool: &SqlitePool,
    folder: &str,
) -> Result<Vec<(String, String, String, String)>, String> {
    let query = if folder.is_empty() {
        sqlx::query_as::<_, (String, String, String, String)>(
            "SELECT id, title, created_at, event_json FROM sessions
             WHERE deleted_at IS NULL AND folder_path = ''
             ORDER BY created_at DESC",
        )
    } else {
        sqlx::query_as::<_, (String, String, String, String)>(
            "SELECT id, title, created_at, event_json FROM sessions
             WHERE deleted_at IS NULL
               AND (folder_path = ? OR folder_path LIKE ? OR folder_path LIKE ?)
             ORDER BY created_at DESC",
        )
        .bind(folder.to_string())
        .bind(format!("{folder}/%"))
        .bind(format!("{folder}\\%"))
    };
    query
        .fetch_all(pool)
        .await
        .map_err(|error| error.to_string())
}

async fn active_session_ids(pool: &SqlitePool) -> Result<Vec<String>, String> {
    sqlx::query_scalar(
        "SELECT id FROM sessions WHERE deleted_at IS NULL ORDER BY created_at DESC, id",
    )
    .fetch_all(pool)
    .await
    .map_err(|error| error.to_string())
}

/// `LoadedNoteFile`
#[derive(Debug, Clone)]
struct NoteFile {
    session_id: String,
    title: String,
    date: Option<String>,
    event_name: Option<String>,
    event_id: String,
    /// `(human_id, name)`; the name may be empty.
    participants: Vec<(String, String)>,
    sections: Vec<(String, String)>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Snippet {
    pub section: String,
    pub text: String,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ContentMatch {
    pub session_id: String,
    pub title: String,
    pub date: Option<String>,
    pub score: i64,
    pub snippets: Vec<Snippet>,
}

/// `loadNoteFile(sessionId)` over the enhancer snapshot.
async fn load_note_file(pool: &SqlitePool, session_id: &str) -> Result<Option<NoteFile>, String> {
    let Some(snapshot) = crate::db::enhancer::load_snapshot(pool, session_id)
        .await
        .map_err(|error| error.to_string())?
    else {
        return Ok(None);
    };
    Ok(Some(note_file(&snapshot)))
}

fn note_file(snapshot: &crate::enhancer::Snapshot) -> NoteFile {
    let event_name = serde_json::from_str::<Value>(&snapshot.event_json)
        .ok()
        .and_then(|event| {
            ["name", "title"].iter().find_map(|key| {
                event
                    .get(key)
                    .and_then(|v| v.as_str())
                    .map(str::trim)
                    .filter(|v| !v.is_empty())
                    .map(str::to_string)
            })
        });
    NoteFile {
        session_id: snapshot.session_id.clone(),
        title: Some(snapshot.title.trim().to_string())
            .filter(|t| !t.is_empty())
            .unwrap_or_else(|| "Untitled".to_string()),
        date: Some(snapshot.created_at.clone()).filter(|d| !d.is_empty()),
        event_name,
        event_id: snapshot.event_id.clone(),
        participants: snapshot
            .participants
            .iter()
            .map(|p| (p.human_id.clone(), p.name.trim().to_string()))
            .collect(),
        sections: note_sections(snapshot),
    }
}

/// `buildNoteSections`
fn note_sections(snapshot: &crate::enhancer::Snapshot) -> Vec<(String, String)> {
    let mut sections = Vec::new();
    if !snapshot.raw_markdown.trim().is_empty() {
        sections.push((
            "Raw note".to_string(),
            snapshot.raw_markdown.trim().to_string(),
        ));
    }
    if !snapshot.meeting_chat.trim().is_empty() {
        sections.push((
            "Meeting chat".to_string(),
            snapshot.meeting_chat.trim().to_string(),
        ));
    }
    for note in &snapshot.enhanced_notes {
        let markdown = crate::db::enhancer::body_to_markdown(&note.content, &note.content_format);
        if markdown.trim().is_empty() {
            continue;
        }
        let title = Some(note.title.trim().to_string())
            .filter(|t| !t.is_empty())
            .unwrap_or_else(|| "Enhanced note".to_string());
        sections.push((title, markdown.trim().to_string()));
    }
    let chunks: Vec<String> = snapshot
        .transcripts
        .iter()
        .filter_map(|transcript| {
            let memo = transcript.memo.trim();
            if !memo.is_empty() {
                return Some(memo.to_string());
            }
            let text = normalize_whitespace(&transcript.words.join(" "));
            (!text.is_empty()).then_some(text)
        })
        .collect();
    if !chunks.is_empty() {
        sections.push(("Transcript".to_string(), chunks.join("\n\n")));
    }
    sections
}

fn normalize_whitespace(value: &str) -> String {
    value.split_whitespace().collect::<Vec<_>>().join(" ")
}

/// `queryTerms`: lowercase terms split on anything but `[a-z0-9@\-.]`,
/// two characters or longer, deduplicated in order.
pub fn query_terms(query: &str) -> Vec<String> {
    let mut terms: Vec<String> = Vec::new();
    for term in query
        .to_lowercase()
        .split(|c: char| !(c.is_ascii_alphanumeric() || matches!(c, '@' | '-' | '.')))
    {
        let term = term.trim();
        if term.chars().count() >= 2 && !terms.iter().any(|t| t == term) {
            terms.push(term.to_string());
        }
    }
    terms
}

/// `createSnippet`: 180 characters either side, with ellipses when cut.
fn create_snippet(text: &str, index: usize, length: usize) -> String {
    let chars: Vec<char> = text.chars().collect();
    let start = index.saturating_sub(SNIPPET_RADIUS);
    let end = (index + length + SNIPPET_RADIUS).min(chars.len());
    let prefix = if start > 0 { "..." } else { "" };
    let suffix = if end < chars.len() { "..." } else { "" };
    let slice: String = chars[start..end].iter().collect();
    format!("{prefix}{}{suffix}", normalize_whitespace(&slice))
}

/// The character index of `needle` in `haystack` (both already lowercased).
fn char_index_of(haystack: &str, needle: &str) -> Option<usize> {
    haystack
        .find(needle)
        .map(|byte| haystack[..byte].chars().count())
}

/// `matchSection`
fn match_section(section: &(String, String), query: &str, terms: &[String]) -> (i64, Vec<Snippet>) {
    let (title, text) = section;
    let lower_text = text.to_lowercase();
    let lower_query = query.to_lowercase();
    let mut snippets = Vec::new();
    let mut score = 0;
    if !lower_query.is_empty()
        && let Some(index) = char_index_of(&lower_text, &lower_query)
    {
        score += 20;
        snippets.push(Snippet {
            section: title.clone(),
            text: create_snippet(text, index, query.chars().count()),
        });
    }
    for term in terms {
        let Some(index) = char_index_of(&lower_text, term) else {
            continue;
        };
        score += 3;
        if snippets.len() < 3 {
            snippets.push(Snippet {
                section: title.clone(),
                text: create_snippet(text, index, term.chars().count()),
            });
        }
    }
    (score, snippets)
}

/// `searchNote`
fn search_note(note: &NoteFile, query: &str) -> Option<ContentMatch> {
    let terms = query_terms(query);
    let lower_query = query.to_lowercase();
    let mut score = 0;
    let mut snippets = Vec::new();
    if note.title.to_lowercase().contains(&lower_query) {
        score += 8;
        snippets.push(Snippet {
            section: "Title".to_string(),
            text: note.title.clone(),
        });
    }
    let matching: Vec<&str> = note
        .participants
        .iter()
        .map(|(_, name)| name.as_str())
        .filter(|name| !name.is_empty() && name.to_lowercase().contains(&lower_query))
        .collect();
    if !matching.is_empty() {
        score += 8;
        snippets.push(Snippet {
            section: "Participants".to_string(),
            text: matching.join(", "),
        });
    }
    if let Some(event) = &note.event_name
        && event.to_lowercase().contains(&lower_query)
    {
        score += 8;
        snippets.push(Snippet {
            section: "Event".to_string(),
            text: event.clone(),
        });
    }
    for section in &note.sections {
        let (section_score, section_snippets) = match_section(section, query, &terms);
        score += section_score;
        snippets.extend(section_snippets);
    }
    if score <= 0 || snippets.is_empty() {
        return None;
    }
    snippets.truncate(3);
    Some(ContentMatch {
        session_id: note.session_id.clone(),
        title: note.title.clone(),
        date: note.date.clone(),
        score,
        snippets,
    })
}

/// `searchMeetingContent`: scan the candidates (every active session when
/// `None`), best scores first.
async fn search_meeting_content(
    pool: &SqlitePool,
    query: &str,
    session_ids: Option<&[String]>,
    limit: usize,
) -> Result<Vec<ContentMatch>, String> {
    let candidates = match session_ids {
        Some(ids) => ids.to_vec(),
        None => active_session_ids(pool).await?,
    };
    let mut results = Vec::new();
    for session_id in candidates {
        let Some(note) = load_note_file(pool, &session_id).await? else {
            continue;
        };
        if let Some(found) = search_note(&note, query) {
            results.push(found);
        }
    }
    results.sort_by(|a, b| b.score.cmp(&a.score));
    results.truncate(limit);
    Ok(results)
}

/// `getDateDistanceDays`
fn date_distance_days(a: &Option<String>, b: &Option<String>) -> Option<f64> {
    let a = to_epoch_ms(&Value::String(a.clone()?));
    let b = to_epoch_ms(&Value::String(b.clone()?));
    if a == 0 || b == 0 {
        return None;
    }
    Some((a - b).abs() as f64 / (24.0 * 60.0 * 60.0 * 1000.0))
}

#[cfg(test)]
mod tests {
    use chrono::TimeZone as _;

    use super::*;

    #[test]
    fn the_registry_lists_the_fifteen_tools_in_order() {
        let names: Vec<&str> = specs().iter().map(|tool| tool.name.as_str()).collect();
        assert_eq!(
            names,
            [
                "list_meetings",
                "get_meeting",
                "get_meeting_transcript",
                "get_recurring_meeting_history",
                "search_meeting_content",
                "read_folder_material",
                "find_related_meetings",
                "search_meetings",
                "search_contacts",
                "search_calendar_events",
                "web_search",
                "edit_memo",
                "edit_summary",
                "apply_session_correction",
                "move_meeting_contents",
            ]
        );
        let search = specs()
            .iter()
            .find(|t| t.name == "search_meetings")
            .unwrap();
        assert_eq!(search.parameters["properties"]["limit"]["maximum"], 10);
        assert!(
            search
                .description
                .starts_with("Search for meetings using note and transcript content")
        );
    }

    #[test]
    fn query_terms_follow_the_frontend_split() {
        assert_eq!(
            query_terms("Release-status, Q3 a review@x.com"),
            ["release-status", "q3", "review@x.com"]
        );
        assert_eq!(query_terms("a b"), Vec::<String>::new());
    }

    #[test]
    fn note_search_scores_like_search_note() {
        let note = NoteFile {
            session_id: "s1".into(),
            title: "Release sync".into(),
            date: Some("2026-09-07T09:00:00.000Z".into()),
            event_name: Some("Weekly release".into()),
            event_id: String::new(),
            participants: vec![("h1".into(), "Ada".into())],
            sections: vec![("Raw note".into(), "We discussed the release plan.".into())],
        };
        let found = search_note(&note, "release").unwrap();
        // Title (8) + event (8) + exact section match (20) + the term (3).
        assert_eq!(found.score, 39);
        assert_eq!(found.snippets.len(), 3);
        assert_eq!(found.snippets[0].section, "Title");
        assert_eq!(found.snippets[2].text, "We discussed the release plan.");
        assert!(search_note(&note, "quokka").is_none());
    }

    #[test]
    fn snippets_cut_with_ellipses() {
        let text = format!("{}needle{}", "a".repeat(200), "b".repeat(200));
        let snippet = create_snippet(&text, 200, 6);
        assert!(snippet.starts_with("...") && snippet.ends_with("..."));
        assert_eq!(snippet.len(), 3 + 180 + 6 + 180 + 3);
    }

    #[test]
    fn created_at_filters_and_timestamps() {
        let filter = anlg_search_index::CreatedAtFilter {
            gte: Some(10),
            lte: Some(20),
            gt: None,
            lt: None,
            eq: None,
        };
        assert!(matches_created_at(15, Some(&filter)));
        assert!(!matches_created_at(25, Some(&filter)));
        assert!(!matches_created_at(0, Some(&filter)));
        assert!(matches_created_at(0, None));
        assert_eq!(
            session_search_timestamp(
                r#"{"started_at":"2026-09-07T10:00:00Z"}"#,
                "2026-09-01T00:00:00.000Z"
            ),
            1_788_775_200_000
        );
        assert_eq!(
            session_search_timestamp("{}", "2026-09-01T00:00:00.000Z"),
            1_788_220_800_000
        );
        let now = chrono::Local
            .with_ymd_and_hms(2026, 9, 7, 12, 0, 0)
            .unwrap();
        let recent = recent_days_filter(3, now);
        let start = chrono::Local.with_ymd_and_hms(2026, 9, 5, 0, 0, 0).unwrap();
        assert_eq!(recent.gte, Some(start.timestamp_millis()));
        assert_eq!(
            recent.lte,
            Some(
                chrono::Local
                    .with_ymd_and_hms(2026, 9, 7, 23, 59, 59)
                    .unwrap()
                    .timestamp_millis()
                    + 999
            )
        );
    }
}
