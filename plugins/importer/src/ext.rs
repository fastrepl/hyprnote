use crate::sources::ImportSourceDyn;
use crate::types::{
    ImportSourceInfo, ImportSourceKind, ImportStats, ImportedHuman, ImportedNote,
    ImportedOrganization, ImportedSessionParticipant, ImportedTranscript,
};
use chrono::{DateTime, NaiveDateTime, Utc};
use hypr_db_user::{Human, Organization, Session, Tag, UserDatabase};
use std::collections::HashMap;
use tauri::path::BaseDirectory;

pub struct Importer<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

struct ImportData {
    organizations: Vec<ImportedOrganization>,
    humans: Vec<ImportedHuman>,
    notes: Vec<ImportedNote>,
    transcripts: Vec<ImportedTranscript>,
    participants: Vec<ImportedSessionParticipant>,
}

impl ImportData {
    fn stats(&self) -> ImportStats {
        ImportStats {
            organizations_count: self.organizations.len(),
            humans_count: self.humans.len(),
            notes_count: self.notes.len(),
            transcripts_count: self.transcripts.len(),
            participants_count: self.participants.len(),
        }
    }
}

async fn load_import_data(source: &dyn ImportSourceDyn) -> Result<ImportData, crate::Error> {
    let organizations = source.import_organizations_boxed().await?;
    let humans = source.import_humans_boxed().await?;
    let notes = source.import_notes_boxed().await?;
    let transcripts = source.import_transcripts_boxed().await?;
    let participants = source.import_session_participants_boxed().await?;

    Ok(ImportData {
        organizations,
        humans,
        notes,
        transcripts,
        participants,
    })
}

fn parse_datetime(s: &str) -> Result<DateTime<Utc>, crate::Error> {
    if s.is_empty() {
        return Ok(Utc::now());
    }

    if let Ok(dt) = DateTime::parse_from_rfc3339(s) {
        return Ok(dt.with_timezone(&Utc));
    }

    if let Ok(naive) = NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S") {
        return Ok(naive.and_utc());
    }

    Err(crate::Error::InvalidData(format!(
        "Unable to parse datetime: {}",
        s
    )))
}

fn imported_org_to_db(org: &ImportedOrganization) -> Organization {
    Organization {
        id: org.id.clone(),
        name: org.name.clone(),
        description: org.description.clone(),
    }
}

fn imported_human_to_db(human: &ImportedHuman) -> Human {
    Human {
        id: human.id.clone(),
        organization_id: human.org_id.clone(),
        is_user: human.is_user,
        full_name: if human.name.is_empty() {
            None
        } else {
            Some(human.name.clone())
        },
        email: human.email.clone(),
        job_title: human.job_title.clone(),
        linkedin_username: human.linkedin_username.clone(),
    }
}

fn imported_note_to_session(
    note: &ImportedNote,
    transcript: Option<&ImportedTranscript>,
    user_id: &str,
) -> Result<Session, crate::Error> {
    let created_at = parse_datetime(&note.created_at)?;
    let visited_at = parse_datetime(&note.updated_at)?;

    let words: Vec<owhisper_interface::Word2> = transcript
        .map(|t| {
            t.words
                .iter()
                .map(|w| owhisper_interface::Word2 {
                    text: w.text.clone(),
                    start_ms: w.start_ms.map(|ms| ms as u64),
                    end_ms: w.end_ms.map(|ms| ms as u64),
                    speaker: None,
                    confidence: None,
                })
                .collect()
        })
        .unwrap_or_default();

    let (record_start, record_end) = transcript
        .map(|t| {
            let start = t
                .start_ms
                .map(|ms| created_at + chrono::Duration::milliseconds(ms as i64));
            let end = t
                .end_ms
                .map(|ms| created_at + chrono::Duration::milliseconds(ms as i64));
            (start, end)
        })
        .unwrap_or((None, None));

    Ok(Session {
        id: note.id.clone(),
        created_at,
        visited_at,
        user_id: user_id.to_string(),
        calendar_event_id: note.event_id.clone(),
        title: note.title.clone(),
        raw_memo_html: note.raw_md.clone().unwrap_or_else(|| note.content.clone()),
        enhanced_memo_html: note.enhanced_md.clone(),
        conversations: vec![],
        words,
        record_start,
        record_end,
        pre_meeting_memo_html: None,
    })
}

async fn persist_import_data(
    db: &UserDatabase,
    data: &ImportData,
    user_id: &str,
) -> Result<ImportStats, crate::Error> {
    let mut stats = ImportStats::default();

    for org in &data.organizations {
        db.upsert_organization(imported_org_to_db(org)).await?;
        stats.organizations_count += 1;
    }

    for human in &data.humans {
        db.upsert_human(imported_human_to_db(human)).await?;
        stats.humans_count += 1;
    }

    let transcripts_by_session: HashMap<String, &ImportedTranscript> = data
        .transcripts
        .iter()
        .map(|t| (t.session_id.clone(), t))
        .collect();

    let mut tag_name_to_id: HashMap<String, String> = HashMap::new();

    for note in &data.notes {
        let transcript = transcripts_by_session.get(&note.id);
        let session = imported_note_to_session(note, transcript.copied(), user_id)?;
        db.upsert_session(session).await?;
        stats.notes_count += 1;

        if transcript.is_some() {
            stats.transcripts_count += 1;
        }

        for tag_name in &note.tags {
            let tag_id = if let Some(id) = tag_name_to_id.get(tag_name) {
                id.clone()
            } else {
                let tag = Tag {
                    id: uuid::Uuid::new_v4().to_string(),
                    name: tag_name.clone(),
                };
                let tag = db.upsert_tag(tag).await?;
                tag_name_to_id.insert(tag_name.clone(), tag.id.clone());
                tag.id
            };

            let _ = db.assign_tag_to_session(&tag_id, &note.id).await;
        }
    }

    for participant in &data.participants {
        let _ = db
            .session_add_participant(&participant.session_id, &participant.human_id)
            .await;
        stats.participants_count += 1;
    }

    Ok(stats)
}

impl<'a, R: tauri::Runtime, M: tauri::Manager<R>> Importer<'a, R, M> {
    pub fn list_available_sources(&self) -> Vec<ImportSourceInfo> {
        crate::sources::list_available_sources()
    }

    async fn get_database(&self) -> Result<UserDatabase, crate::Error> {
        let dir_path = self
            .manager
            .path()
            .resolve("hyprnote", BaseDirectory::Data)?;
        std::fs::create_dir_all(&dir_path)?;
        let file_path = dir_path.join("db.sqlite");

        let db = hypr_db_core::DatabaseBuilder::default()
            .local(file_path)
            .build()
            .await
            .map_err(|e| crate::Error::Database(hypr_db_user::Error::from(e)))?;

        let user_db = UserDatabase::from(db);
        hypr_db_user::migrate(&user_db).await?;

        Ok(user_db)
    }

    async fn get_or_create_import_user(&self, db: &UserDatabase) -> Result<String, crate::Error> {
        let humans = db.list_humans(None).await?;
        if let Some(user) = humans.iter().find(|h| h.is_user) {
            return Ok(user.id.clone());
        }

        let user = Human {
            id: uuid::Uuid::new_v4().to_string(),
            organization_id: None,
            is_user: true,
            full_name: Some("Imported User".to_string()),
            email: None,
            job_title: None,
            linkedin_username: None,
        };
        let user = db.upsert_human(user).await?;
        Ok(user.id)
    }

    pub async fn run_import(
        &self,
        source_kind: ImportSourceKind,
    ) -> Result<ImportStats, crate::Error> {
        let source = crate::sources::get_source(source_kind, None, None, None);

        if !source.is_available() {
            return Err(crate::Error::SourceNotFound(
                "Import source is not available".to_string(),
            ));
        }

        let data = load_import_data(source.as_ref()).await?;
        let db = self.get_database().await?;
        let user_id = self.get_or_create_import_user(&db).await?;

        persist_import_data(&db, &data, &user_id).await
    }

    pub async fn run_import_dry(
        &self,
        source_kind: ImportSourceKind,
    ) -> Result<ImportStats, crate::Error> {
        let source = crate::sources::get_source(source_kind, None, None, None);

        if !source.is_available() {
            return Err(crate::Error::SourceNotFound(
                "Import source is not available".to_string(),
            ));
        }

        let data = load_import_data(source.as_ref()).await?;
        Ok(data.stats())
    }
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
