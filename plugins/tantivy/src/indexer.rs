use tauri::Manager;

use crate::{SearchDocument, TantivyPluginExt};

fn strip_html(html: &str) -> String {
    let mut result = String::with_capacity(html.len());
    let mut in_tag = false;
    for c in html.chars() {
        match c {
            '<' => in_tag = true,
            '>' => {
                in_tag = false;
                result.push(' ');
            }
            _ if !in_tag => result.push(c),
            _ => {}
        }
    }

    let collapsed: String = result.split_whitespace().collect::<Vec<_>>().join(" ");
    collapsed
}

fn session_to_document(session: &hypr_db_user::Session) -> SearchDocument {
    let mut content_parts = Vec::new();

    let raw_text = strip_html(&session.raw_memo_html);
    if !raw_text.is_empty() {
        content_parts.push(raw_text);
    }

    if let Some(ref enhanced) = session.enhanced_memo_html {
        let enhanced_text = strip_html(enhanced);
        if !enhanced_text.is_empty() {
            content_parts.push(enhanced_text);
        }
    }

    let transcript_text: String = session
        .words
        .iter()
        .map(|w| w.text.as_str())
        .collect::<Vec<_>>()
        .join(" ");
    if !transcript_text.is_empty() {
        content_parts.push(transcript_text);
    }

    let title = if session.title.is_empty() {
        "Untitled".to_string()
    } else {
        session.title.clone()
    };

    SearchDocument {
        id: session.id.clone(),
        doc_type: "session".to_string(),
        language: None,
        title,
        content: content_parts.join(" "),
        created_at: session.created_at.timestamp_millis(),
        facets: vec![],
    }
}

fn human_to_document(human: &hypr_db_user::Human) -> SearchDocument {
    let title = human.full_name.as_deref().unwrap_or("Unknown").to_string();

    let mut content_parts = Vec::new();
    if let Some(ref email) = human.email {
        content_parts.push(email.clone());
    }
    if let Some(ref job_title) = human.job_title {
        content_parts.push(job_title.clone());
    }
    if let Some(ref linkedin) = human.linkedin_username {
        content_parts.push(linkedin.clone());
    }

    SearchDocument {
        id: human.id.clone(),
        doc_type: "human".to_string(),
        language: None,
        title,
        content: content_parts.join(" "),
        created_at: 0,
        facets: vec![],
    }
}

fn organization_to_document(org: &hypr_db_user::Organization) -> SearchDocument {
    let title = if org.name.is_empty() {
        "Unknown Organization".to_string()
    } else {
        org.name.clone()
    };

    let content = org.description.clone().unwrap_or_default();

    SearchDocument {
        id: org.id.clone(),
        doc_type: "organization".to_string(),
        language: None,
        title,
        content,
        created_at: 0,
        facets: vec![],
    }
}

async fn get_user_db<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
) -> Option<hypr_db_user::UserDatabase> {
    let state = app.try_state::<tauri_plugin_db2::ManagedState>()?;
    let guard = state.lock().await;
    let db = guard.local_db.as_ref()?;
    Some(hypr_db_user::UserDatabase::from(db.clone()))
}

pub async fn populate_index<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    for attempt in 0..10 {
        if attempt > 0 {
            tokio::time::sleep(std::time::Duration::from_millis(500)).await;
        }

        let user_db = match get_user_db(app).await {
            Some(db) => db,
            None => {
                tracing::debug!("DB not ready yet, attempt {}/10", attempt + 1);
                continue;
            }
        };

        if let Err(e) = app.tantivy().reindex(None).await {
            tracing::error!("Failed to clear index before populating: {}", e);
            return;
        }

        let mut total = 0;

        match user_db.list_sessions(None).await {
            Ok(sessions) => {
                for session in &sessions {
                    let doc = session_to_document(session);
                    if let Err(e) = app.tantivy().add_document(None, doc).await {
                        tracing::error!("Failed to index session {}: {}", session.id, e);
                    } else {
                        total += 1;
                    }
                }
            }
            Err(e) => tracing::error!("Failed to list sessions: {}", e),
        }

        match user_db.list_humans(None).await {
            Ok(humans) => {
                for human in &humans {
                    let doc = human_to_document(human);
                    if let Err(e) = app.tantivy().add_document(None, doc).await {
                        tracing::error!("Failed to index human {}: {}", human.id, e);
                    } else {
                        total += 1;
                    }
                }
            }
            Err(e) => tracing::error!("Failed to list humans: {}", e),
        }

        match user_db.list_organizations(None).await {
            Ok(orgs) => {
                for org in &orgs {
                    let doc = organization_to_document(org);
                    if let Err(e) = app.tantivy().add_document(None, doc).await {
                        tracing::error!("Failed to index organization {}: {}", org.id, e);
                    } else {
                        total += 1;
                    }
                }
            }
            Err(e) => tracing::error!("Failed to list organizations: {}", e),
        }

        if let Err(e) = app.tantivy().flush(None).await {
            tracing::error!("Failed to flush index after populating: {}", e);
        }

        tracing::info!("Tantivy index populated with {} documents", total);
        return;
    }

    tracing::error!("Failed to populate Tantivy index: DB not ready after 10 attempts");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_strip_html_basic() {
        assert_eq!(strip_html("<p>Hello</p>"), "Hello");
        assert_eq!(strip_html("<b>bold</b> text"), "bold text");
        assert_eq!(strip_html("no tags"), "no tags");
        assert_eq!(strip_html(""), "");
    }

    #[test]
    fn test_strip_html_nested() {
        assert_eq!(
            strip_html("<div><p>nested <b>bold</b></p></div>"),
            "nested bold"
        );
    }

    #[test]
    fn test_strip_html_whitespace() {
        assert_eq!(strip_html("<p>  lots   of   space  </p>"), "lots of space");
    }

    #[test]
    fn test_session_to_document_empty_title() {
        let session = hypr_db_user::Session {
            id: "test-id".to_string(),
            created_at: chrono::Utc::now(),
            visited_at: chrono::Utc::now(),
            user_id: "user-1".to_string(),
            calendar_event_id: None,
            title: "".to_string(),
            raw_memo_html: "<p>some notes</p>".to_string(),
            enhanced_memo_html: None,
            conversations: vec![],
            words: vec![],
            record_start: None,
            record_end: None,
            pre_meeting_memo_html: None,
        };
        let doc = session_to_document(&session);
        assert_eq!(doc.title, "Untitled");
        assert_eq!(doc.doc_type, "session");
        assert_eq!(doc.content, "some notes");
    }

    #[test]
    fn test_human_to_document() {
        let human = hypr_db_user::Human {
            id: "h1".to_string(),
            organization_id: None,
            is_user: false,
            full_name: Some("John Doe".to_string()),
            email: Some("john@example.com".to_string()),
            job_title: Some("Engineer".to_string()),
            linkedin_username: None,
        };
        let doc = human_to_document(&human);
        assert_eq!(doc.title, "John Doe");
        assert_eq!(doc.doc_type, "human");
        assert_eq!(doc.content, "john@example.com Engineer");
    }

    #[test]
    fn test_organization_to_document() {
        let org = hypr_db_user::Organization {
            id: "o1".to_string(),
            name: "Acme Corp".to_string(),
            description: Some("A company".to_string()),
        };
        let doc = organization_to_document(&org);
        assert_eq!(doc.title, "Acme Corp");
        assert_eq!(doc.doc_type, "organization");
        assert_eq!(doc.content, "A company");
    }
}
