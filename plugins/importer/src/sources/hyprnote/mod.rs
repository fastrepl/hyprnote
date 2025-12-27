mod nightly;
mod stable;

pub use nightly::HyprnoteV0NightlySource;
pub use stable::HyprnoteV0StableSource;

use crate::error::Result;
use crate::types::{
    ImportedHuman, ImportedNote, ImportedOrganization, ImportedSessionParticipant,
    ImportedTranscript, ImportedTranscriptSegment, ImportedWord,
};
use hypr_db_user::{Session, Tag, UserDatabase};
use std::path::PathBuf;

pub(super) async fn open_database(path: &PathBuf) -> Result<UserDatabase> {
    let db = hypr_db_core::DatabaseBuilder::default()
        .local(path)
        .build()
        .await?;
    Ok(UserDatabase::from(db))
}

pub(super) async fn import_notes_from_db(db: &UserDatabase) -> Result<Vec<ImportedNote>> {
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

pub(super) async fn import_transcripts_from_db(
    db: &UserDatabase,
) -> Result<Vec<ImportedTranscript>> {
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

pub(super) async fn import_humans_from_db(db: &UserDatabase) -> Result<Vec<ImportedHuman>> {
    let humans = db.list_humans(None).await?;
    Ok(humans
        .into_iter()
        .map(|h| ImportedHuman {
            id: h.id,
            created_at: String::new(), // Not available in old DB
            name: h.full_name.unwrap_or_default(),
            email: h.email,
            org_id: h.organization_id,
            job_title: h.job_title,
            linkedin_username: h.linkedin_username,
            is_user: h.is_user,
        })
        .collect())
}

pub(super) async fn import_organizations_from_db(
    db: &UserDatabase,
) -> Result<Vec<ImportedOrganization>> {
    let orgs = db.list_organizations(None).await?;
    Ok(orgs
        .into_iter()
        .map(|o| ImportedOrganization {
            id: o.id,
            created_at: String::new(), // Not available in old DB
            name: o.name,
            description: o.description,
        })
        .collect())
}

pub(super) async fn import_session_participants_from_db(
    db: &UserDatabase,
) -> Result<Vec<ImportedSessionParticipant>> {
    let sessions = db.list_sessions(None).await?;
    let mut participants = Vec::new();

    for session in sessions {
        let session_participants = db.session_list_participants(&session.id).await?;
        for human in session_participants {
            participants.push(ImportedSessionParticipant {
                session_id: session.id.clone(),
                human_id: human.id,
                source: "imported".to_string(),
            });
        }
    }

    Ok(participants)
}

fn session_to_imported_note(session: Session, tags: Vec<Tag>) -> ImportedNote {
    let content = get_session_content(&session);
    // Naive markdown conversion: just stripping HTML for now as per previous logic,
    // but populating raw_md and enhanced_md fields.
    let raw_md = if !session.raw_memo_html.is_empty() {
        Some(strip_html_tags(&session.raw_memo_html))
    } else {
        None
    };

    let enhanced_md = if let Some(ref enhanced) = session.enhanced_memo_html {
        if !enhanced.is_empty() {
            Some(strip_html_tags(enhanced))
        } else {
            None
        }
    } else {
        None
    };

    ImportedNote {
        id: session.id,
        title: session.title,
        content,
        raw_md,
        enhanced_md,
        created_at: session.created_at.to_rfc3339(),
        updated_at: session.visited_at.to_rfc3339(),
        folder_id: None,
        event_id: session.calendar_event_id,
        tags: tags.into_iter().map(|t| t.name).collect(),
    }
}

fn get_session_content(session: &Session) -> String {
    if let Some(ref enhanced) = session.enhanced_memo_html
        && !enhanced.is_empty()
    {
        return strip_html_tags(enhanced);
    }

    if !session.raw_memo_html.is_empty() {
        return strip_html_tags(&session.raw_memo_html);
    }

    String::new()
}

fn strip_html_tags(html: &str) -> String {
    // Basic pre-processing to preserve structure
    let pre_processed = html
        .replace("</div>", "\n")
        .replace("</p>", "\n\n")
        .replace("<br>", "\n")
        .replace("<br/>", "\n")
        .replace("<br />", "\n");

    let mut result = String::new();
    let mut in_tag = false;

    for c in pre_processed.chars() {
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
        .replace("&#39;", "'")
        .trim()
        .to_string()
}

fn session_to_imported_transcript(session: Session) -> ImportedTranscript {
    let words: Vec<ImportedWord> = session
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

            ImportedWord {
                id: format!("{}-{}", session.id, idx),
                start_ms: word.start_ms.map(|ms| ms as f64),
                end_ms: word.end_ms.map(|ms| ms as f64),
                text: word.text.clone(),
                speaker,
            }
        })
        .collect();

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
                start_timestamp: word.start_ms.map(format_timestamp).unwrap_or_default(),
                end_timestamp: word.end_ms.map(format_timestamp).unwrap_or_default(),
                text: word.text.clone(),
                speaker,
            }
        })
        .collect();

    ImportedTranscript {
        id: session.id.clone(),
        session_id: session.id.clone(), // Explicit link
        title: session.title,
        created_at: session.created_at.to_rfc3339(),
        updated_at: session.visited_at.to_rfc3339(),
        segments,
        words,
        start_ms: session.record_start.map(|dt| dt.timestamp_millis() as f64),
        end_ms: session.record_end.map(|dt| dt.timestamp_millis() as f64),
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
