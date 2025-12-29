mod nightly;
mod stable;
mod transforms;

pub use nightly::HyprnoteV0NightlySource;
pub use stable::HyprnoteV0StableSource;

use crate::error::Result;
use crate::types::{
    ImportedHuman, ImportedNote, ImportedOrganization, ImportedSessionParticipant,
    ImportedTranscript,
};
use hypr_db_user::UserDatabase;
use std::path::PathBuf;
use transforms::{session_to_imported_note, session_to_imported_transcript};

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
