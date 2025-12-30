use std::collections::HashMap;

use serde_json::{Map, Value, json};
use tauri_plugin_path2::Path2PluginExt;

use crate::sources::get_source;
use crate::types::{
    ImportSourceInfo, ImportSourceKind, ImportedHuman, ImportedNote, ImportedOrganization,
    ImportedSessionParticipant, ImportedTranscript,
};

const DEFAULT_USER_ID: &str = "00000000-0000-0000-0000-000000000000";
const IMPORT_FILENAME: &str = "import.json";

pub struct Importer<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> Importer<'a, R, M> {
    pub fn list_available_sources(&self) -> Vec<ImportSourceInfo> {
        crate::sources::list_available_sources()
    }

    pub async fn run_import(&self, source: ImportSourceKind) -> crate::Result<()> {
        let (tables, values) = self.build_import_data(source).await?;

        let import_path = self
            .manager
            .app_handle()
            .path2()
            .base()
            .map_err(|e| crate::Error::Io(std::io::Error::other(e.to_string())))?
            .join(IMPORT_FILENAME);

        let content = serde_json::to_string_pretty(&json!([tables, values]))?;

        if content.trim().is_empty() || content == "[{},{}]" {
            return Err(crate::Error::Validation("Import data is empty".to_string()));
        }

        std::fs::write(&import_path, content)?;

        Ok(())
    }

    pub async fn run_import_dry(&self, source: ImportSourceKind) -> crate::Result<()> {
        let (tables, _values) = self.build_import_data(source).await?;

        if tables.as_object().map(|o| o.is_empty()).unwrap_or(true) {
            return Err(crate::Error::Validation(
                "No data found to import".to_string(),
            ));
        }

        Ok(())
    }

    async fn build_import_data(&self, source: ImportSourceKind) -> crate::Result<(Value, Value)> {
        let import_source = get_source(source, None, None);

        let notes = import_source.import_notes_boxed().await?;
        let transcripts = import_source.import_transcripts_boxed().await?;
        let humans = import_source.import_humans_boxed().await?;
        let organizations = import_source.import_organizations_boxed().await?;
        let session_participants = import_source.import_session_participants_boxed().await?;

        let mut tables: Map<String, Value> = Map::new();

        let sessions_table = build_sessions_table(&notes);
        if !sessions_table.is_empty() {
            tables.insert("sessions".to_string(), json!(sessions_table));
        }

        let (transcripts_table, words_table) = build_transcripts_and_words_tables(&transcripts);
        if !transcripts_table.is_empty() {
            tables.insert("transcripts".to_string(), json!(transcripts_table));
        }
        if !words_table.is_empty() {
            tables.insert("words".to_string(), json!(words_table));
        }

        let humans_table = build_humans_table(&humans);
        if !humans_table.is_empty() {
            tables.insert("humans".to_string(), json!(humans_table));
        }

        let organizations_table = build_organizations_table(&organizations);
        if !organizations_table.is_empty() {
            tables.insert("organizations".to_string(), json!(organizations_table));
        }

        let mapping_session_participant_table =
            build_mapping_session_participant_table(&session_participants);
        if !mapping_session_participant_table.is_empty() {
            tables.insert(
                "mapping_session_participant".to_string(),
                json!(mapping_session_participant_table),
            );
        }

        let (tags_table, mapping_tag_session_table) = build_tags_tables(&notes);
        if !tags_table.is_empty() {
            tables.insert("tags".to_string(), json!(tags_table));
        }
        if !mapping_tag_session_table.is_empty() {
            tables.insert(
                "mapping_tag_session".to_string(),
                json!(mapping_tag_session_table),
            );
        }

        Ok((json!(tables), json!({})))
    }
}

fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339()
}

fn ensure_timestamp(ts: &str) -> String {
    if ts.is_empty() {
        now_iso()
    } else {
        ts.to_string()
    }
}

fn build_sessions_table(notes: &[ImportedNote]) -> Map<String, Value> {
    let mut table = Map::new();

    for note in notes {
        let mut row = Map::new();
        row.insert("user_id".to_string(), json!(DEFAULT_USER_ID));
        row.insert(
            "created_at".to_string(),
            json!(ensure_timestamp(&note.created_at)),
        );
        row.insert("title".to_string(), json!(note.title));
        row.insert(
            "raw_md".to_string(),
            json!(note.raw_md.clone().unwrap_or_default()),
        );
        row.insert(
            "enhanced_md".to_string(),
            json!(note.enhanced_md.clone().unwrap_or_default()),
        );

        if let Some(ref folder_id) = note.folder_id {
            row.insert("folder_id".to_string(), json!(folder_id));
        }
        if let Some(ref event_id) = note.event_id {
            row.insert("event_id".to_string(), json!(event_id));
        }

        table.insert(note.id.clone(), json!(row));
    }

    table
}

fn build_transcripts_and_words_tables(
    transcripts: &[ImportedTranscript],
) -> (Map<String, Value>, Map<String, Value>) {
    let mut transcripts_table = Map::new();
    let mut words_table = Map::new();

    for transcript in transcripts {
        let started_at = transcript.start_ms.unwrap_or(0.0) as i64;
        let ended_at = transcript.end_ms.map(|ms| ms as i64);

        let mut row = Map::new();
        row.insert("user_id".to_string(), json!(DEFAULT_USER_ID));
        row.insert(
            "created_at".to_string(),
            json!(ensure_timestamp(&transcript.created_at)),
        );
        row.insert("session_id".to_string(), json!(transcript.session_id));
        row.insert("started_at".to_string(), json!(started_at));
        if let Some(ended) = ended_at {
            row.insert("ended_at".to_string(), json!(ended));
        }

        transcripts_table.insert(transcript.id.clone(), json!(row));

        for word in &transcript.words {
            let mut word_row = Map::new();
            word_row.insert("user_id".to_string(), json!(DEFAULT_USER_ID));
            word_row.insert(
                "created_at".to_string(),
                json!(ensure_timestamp(&transcript.created_at)),
            );
            word_row.insert("transcript_id".to_string(), json!(transcript.id));
            word_row.insert("text".to_string(), json!(word.text));
            word_row.insert(
                "start_ms".to_string(),
                json!(word.start_ms.unwrap_or(0.0) as i64),
            );
            word_row.insert(
                "end_ms".to_string(),
                json!(word.end_ms.unwrap_or(0.0) as i64),
            );
            word_row.insert("channel".to_string(), json!(0));
            word_row.insert("speaker".to_string(), json!(word.speaker));

            words_table.insert(word.id.clone(), json!(word_row));
        }
    }

    (transcripts_table, words_table)
}

fn build_humans_table(humans: &[ImportedHuman]) -> Map<String, Value> {
    let mut table = Map::new();

    for human in humans {
        let mut row = Map::new();
        row.insert("user_id".to_string(), json!(DEFAULT_USER_ID));
        row.insert(
            "created_at".to_string(),
            json!(ensure_timestamp(&human.created_at)),
        );
        row.insert("name".to_string(), json!(human.name));

        if let Some(ref email) = human.email {
            row.insert("email".to_string(), json!(email));
        }
        if let Some(ref org_id) = human.org_id {
            row.insert("org_id".to_string(), json!(org_id));
        }
        if let Some(ref job_title) = human.job_title {
            row.insert("job_title".to_string(), json!(job_title));
        }
        if let Some(ref linkedin_username) = human.linkedin_username {
            row.insert("linkedin_username".to_string(), json!(linkedin_username));
        }
        row.insert("is_user".to_string(), json!(human.is_user));

        table.insert(human.id.clone(), json!(row));
    }

    table
}

fn build_organizations_table(organizations: &[ImportedOrganization]) -> Map<String, Value> {
    let mut table = Map::new();

    for org in organizations {
        let mut row = Map::new();
        row.insert("user_id".to_string(), json!(DEFAULT_USER_ID));
        row.insert(
            "created_at".to_string(),
            json!(ensure_timestamp(&org.created_at)),
        );
        row.insert("name".to_string(), json!(org.name));

        table.insert(org.id.clone(), json!(row));
    }

    table
}

fn build_mapping_session_participant_table(
    participants: &[ImportedSessionParticipant],
) -> Map<String, Value> {
    let mut table = Map::new();

    for (idx, participant) in participants.iter().enumerate() {
        let mut row = Map::new();
        row.insert("user_id".to_string(), json!(DEFAULT_USER_ID));
        row.insert("created_at".to_string(), json!(now_iso()));
        row.insert("session_id".to_string(), json!(participant.session_id));
        row.insert("human_id".to_string(), json!(participant.human_id));
        row.insert("source".to_string(), json!("auto"));

        let id = format!(
            "{}-{}-{}",
            participant.session_id, participant.human_id, idx
        );
        table.insert(id, json!(row));
    }

    table
}

fn build_tags_tables(notes: &[ImportedNote]) -> (Map<String, Value>, Map<String, Value>) {
    let mut tags_table = Map::new();
    let mut mapping_table = Map::new();
    let mut tag_name_to_id: HashMap<String, String> = HashMap::new();

    for note in notes {
        for tag_name in &note.tags {
            let tag_id = tag_name_to_id
                .entry(tag_name.clone())
                .or_insert_with(|| uuid::Uuid::new_v4().to_string())
                .clone();

            if !tags_table.contains_key(&tag_id) {
                let mut tag_row = Map::new();
                tag_row.insert("user_id".to_string(), json!(DEFAULT_USER_ID));
                tag_row.insert("created_at".to_string(), json!(now_iso()));
                tag_row.insert("name".to_string(), json!(tag_name));
                tags_table.insert(tag_id.clone(), json!(tag_row));
            }

            let mapping_id = format!("{}-{}", note.id, tag_id);
            let mut mapping_row = Map::new();
            mapping_row.insert("user_id".to_string(), json!(DEFAULT_USER_ID));
            mapping_row.insert("created_at".to_string(), json!(now_iso()));
            mapping_row.insert("tag_id".to_string(), json!(tag_id));
            mapping_row.insert("session_id".to_string(), json!(note.id));
            mapping_table.insert(mapping_id, json!(mapping_row));
        }
    }

    (tags_table, mapping_table)
}

pub trait ImporterPluginExt<R: tauri::Runtime> {
    fn importer(&self) -> Importer<'_, R, Self>
    where
        Self: tauri::Manager<R> + Sized;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> ImporterPluginExt<R> for T {
    fn importer(&self) -> Importer<'_, R, Self>
    where
        Self: Sized,
    {
        Importer {
            manager: self,
            _runtime: std::marker::PhantomData,
        }
    }
}
