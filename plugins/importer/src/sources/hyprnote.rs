use crate::error::Result;
use crate::sources::{ImportConfig, ImportSource};
use crate::types::{
    ImportSourceInfo, ImportSourceKind, ImportedNote, ImportedTranscript, ImportedTranscriptSegment,
};
use hypr_db_user::{Session, Tag, UserDatabase};
use std::path::PathBuf;

pub struct HyprnoteV0StableSource;
pub struct HyprnoteV0NightlySource;

pub fn default_stable_path() -> PathBuf {
    dirs::data_dir()
        .map(|data| data.join("com.hyprnote.stable"))
        .unwrap_or_else(|| PathBuf::from("com.hyprnote.stable"))
}

pub fn default_nightly_path() -> PathBuf {
    dirs::data_dir()
        .map(|data| data.join("com.hyprnote.nightly"))
        .unwrap_or_else(|| PathBuf::from("com.hyprnote.nightly"))
}

pub fn stable_exists() -> bool {
    db_path(&default_stable_path()).exists()
}

pub fn nightly_exists() -> bool {
    db_path(&default_nightly_path()).exists()
}

fn db_path(base_path: &PathBuf) -> PathBuf {
    base_path.join("hyprnote").join("db.sqlite")
}

async fn open_database(base_path: &PathBuf) -> Result<UserDatabase> {
    let path = db_path(base_path);
    let db = hypr_db_user::Database::from(
        hypr_db_core::DatabaseBuilder::default()
            .local(&path)
            .build()
            .await?,
    );
    Ok(UserDatabase::from(db))
}

async fn import_notes_from_db(db: &UserDatabase) -> Result<Vec<ImportedNote>> {
    let sessions = db.list_sessions(None).await?;
    let mut notes = Vec::new();

    for session in sessions {
        if session.is_empty() {
            continue;
        }

        let tags = db.list_session_tags(&session.id).await?;
        let note = session_to_imported_note(session, tags);
        notes.push(note);
    }

    Ok(notes)
}

async fn import_transcripts_from_db(db: &UserDatabase) -> Result<Vec<ImportedTranscript>> {
    let sessions = db.list_sessions(None).await?;
    let mut transcripts = Vec::new();

    for session in sessions {
        if session.words.is_empty() {
            continue;
        }

        let transcript = session_to_imported_transcript(session);
        transcripts.push(transcript);
    }

    Ok(transcripts)
}

fn session_to_imported_note(session: Session, tags: Vec<Tag>) -> ImportedNote {
    let content = get_session_content(&session);

    ImportedNote {
        id: session.id,
        title: session.title,
        content,
        created_at: session.created_at.to_rfc3339(),
        updated_at: session.visited_at.to_rfc3339(),
        tags: tags.into_iter().map(|t| t.name).collect(),
    }
}

fn get_session_content(session: &Session) -> String {
    if let Some(ref enhanced) = session.enhanced_memo_html {
        if !enhanced.is_empty() {
            return strip_html_tags(enhanced);
        }
    }

    if !session.raw_memo_html.is_empty() {
        return strip_html_tags(&session.raw_memo_html);
    }

    String::new()
}

fn strip_html_tags(html: &str) -> String {
    let mut result = String::new();
    let mut in_tag = false;

    for c in html.chars() {
        match c {
            '<' => in_tag = true,
            '>' => in_tag = false,
            _ if !in_tag => result.push(c),
            _ => {}
        }
    }

    result
        .replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .trim()
        .to_string()
}

fn session_to_imported_transcript(session: Session) -> ImportedTranscript {
    let segments: Vec<ImportedTranscriptSegment> = session
        .words
        .iter()
        .enumerate()
        .map(|(idx, word)| {
            let speaker = match &word.speaker {
                Some(owhisper_interface::SpeakerIdentity::Assigned { label, .. }) => label.clone(),
                Some(owhisper_interface::SpeakerIdentity::Unassigned { index }) => {
                    format!("Speaker {}", index)
                }
                None => "Unknown".to_string(),
            };

            ImportedTranscriptSegment {
                id: format!("{}-{}", session.id, idx),
                start_timestamp: word
                    .start_ms
                    .map(|ms| format_timestamp(ms))
                    .unwrap_or_default(),
                end_timestamp: word
                    .end_ms
                    .map(|ms| format_timestamp(ms))
                    .unwrap_or_default(),
                text: word.text.clone(),
                speaker,
            }
        })
        .collect();

    ImportedTranscript {
        id: session.id,
        title: session.title,
        created_at: session.created_at.to_rfc3339(),
        updated_at: session.visited_at.to_rfc3339(),
        segments,
    }
}

fn format_timestamp(ms: u64) -> String {
    let total_seconds = ms / 1000;
    let hours = total_seconds / 3600;
    let minutes = (total_seconds % 3600) / 60;
    let seconds = total_seconds % 60;
    let millis = ms % 1000;

    format!("{:02}:{:02}:{:02}.{:03}", hours, minutes, seconds, millis)
}

impl ImportSource for HyprnoteV0StableSource {
    fn info(&self) -> ImportSourceInfo {
        ImportSourceInfo {
            kind: ImportSourceKind::HyprnoteV0Stable,
            name: "Hyprnote (Stable)".to_string(),
            description: "Import notes and transcripts from Hyprnote stable version".to_string(),
        }
    }

    async fn import_notes(&self, _config: ImportConfig) -> Result<Vec<ImportedNote>> {
        let db = open_database(&default_stable_path()).await?;
        import_notes_from_db(&db).await
    }

    async fn import_transcripts(&self, _config: ImportConfig) -> Result<Vec<ImportedTranscript>> {
        let db = open_database(&default_stable_path()).await?;
        import_transcripts_from_db(&db).await
    }
}

impl ImportSource for HyprnoteV0NightlySource {
    fn info(&self) -> ImportSourceInfo {
        ImportSourceInfo {
            kind: ImportSourceKind::HyprnoteV0Nightly,
            name: "Hyprnote (Nightly)".to_string(),
            description: "Import notes and transcripts from Hyprnote nightly version".to_string(),
        }
    }

    async fn import_notes(&self, _config: ImportConfig) -> Result<Vec<ImportedNote>> {
        let db = open_database(&default_nightly_path()).await?;
        import_notes_from_db(&db).await
    }

    async fn import_transcripts(&self, _config: ImportConfig) -> Result<Vec<ImportedTranscript>> {
        let db = open_database(&default_nightly_path()).await?;
        import_transcripts_from_db(&db).await
    }
}
