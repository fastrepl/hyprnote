mod transforms;

use crate::types::{
    ImportResult, ImportedEnhancedNote, ImportedHuman, ImportedOrganization,
    ImportedSessionParticipant, ImportedTemplate, ImportedTemplateSection,
};
use hypr_db_user::UserDatabase;
use std::path::Path;
use transforms::{session_to_imported_note, session_to_imported_transcript};

pub async fn import_all_from_path(path: &Path) -> Result<ImportResult, crate::Error> {
    let db = hypr_db_core::DatabaseBuilder::default()
        .local(path)
        .build()
        .await?;
    let db = UserDatabase::from(db);

    // Older Hyprnote DBs can have `sessions.words` as NULL/empty, but db-user's
    // `Session::from_row` expects a non-null JSON string.
    let conn = db.conn()?;
    conn.execute(
        "UPDATE sessions SET words = '[]' WHERE words IS NULL OR words = ''",
        (),
    )
    .await
    .map_err(hypr_db_user::Error::from)?;

    let sessions = db.list_sessions(None).await?;

    let mut notes = Vec::new();
    let mut transcripts = Vec::new();
    let mut participants = Vec::new();
    let mut enhanced_notes = Vec::new();

    for session in sessions {
        let session_participants = db.session_list_participants(&session.id).await?;
        for human in session_participants {
            participants.push(ImportedSessionParticipant {
                session_id: session.id.clone(),
                human_id: human.id,
                source: "imported".to_string(),
            });
        }

        if !session.words.is_empty() {
            transcripts.push(session_to_imported_transcript(session.clone()));
        }

        if let Some(ref enhanced_html) = session.enhanced_memo_html {
            if !enhanced_html.is_empty() {
                enhanced_notes.push(ImportedEnhancedNote {
                    id: format!("enhanced-{}", session.id),
                    session_id: session.id.clone(),
                    content: enhanced_html.clone(),
                    template_id: None,
                    position: 1,
                    title: String::new(),
                });
            }
        }

        if !session.is_empty() {
            let tags = db.list_session_tags(&session.id).await?;
            notes.push(session_to_imported_note(session, tags));
        }
    }

    let humans = db
        .list_humans(None)
        .await?
        .into_iter()
        .map(|h| ImportedHuman {
            id: h.id,
            created_at: String::new(),
            name: h.full_name.unwrap_or_default(),
            email: h.email,
            org_id: h.organization_id,
            job_title: h.job_title,
            linkedin_username: h.linkedin_username,
        })
        .collect();

    let organizations = db
        .list_organizations(None)
        .await?
        .into_iter()
        .map(|o| ImportedOrganization {
            id: o.id,
            created_at: String::new(),
            name: o.name,
            description: o.description,
        })
        .collect();

    let templates = db
        .list_templates("")
        .await?
        .into_iter()
        .map(|t| ImportedTemplate {
            id: t.id,
            title: t.title,
            description: t.description,
            sections: t
                .sections
                .into_iter()
                .map(|s| ImportedTemplateSection {
                    title: s.title,
                    description: s.description,
                })
                .collect(),
            tags: t.tags,
            context_option: t.context_option,
        })
        .collect();

    Ok(ImportResult {
        notes,
        transcripts,
        humans,
        organizations,
        participants,
        templates,
        enhanced_notes,
    })
}
