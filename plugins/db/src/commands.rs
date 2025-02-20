#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(db))]
pub async fn list_calendars(
    db: tauri::State<'_, hypr_db::user::UserDatabase>,
) -> Result<Vec<hypr_db::user::Calendar>, String> {
    db.list_calendars().await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(db))]
pub async fn list_participants(
    db: tauri::State<'_, hypr_db::user::UserDatabase>,
    event_id: String,
) -> Result<Vec<hypr_db::user::Human>, String> {
    db.list_participants(event_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(db))]
pub async fn upsert_calendar(
    db: tauri::State<'_, hypr_db::user::UserDatabase>,
    calendar: hypr_db::user::Calendar,
) -> Result<hypr_db::user::Calendar, String> {
    db.upsert_calendar(calendar)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(db))]
pub async fn upsert_session(
    db: tauri::State<'_, hypr_db::user::UserDatabase>,
    session: hypr_db::user::Session,
) -> Result<hypr_db::user::Session, String> {
    db.upsert_session(session).await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(db, state))]
pub async fn list_templates(
    db: tauri::State<'_, hypr_db::user::UserDatabase>,
    state: tauri::State<'_, crate::ManagedState>,
) -> Result<Vec<hypr_db::user::Template>, String> {
    let user_id = {
        let state = state.lock().unwrap();

        state
            .user_id
            .clone()
            .ok_or(crate::Error::NoneUser)
            .map_err(|e| e.to_string())?
    };

    db.list_templates(user_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(db))]
pub async fn upsert_template(
    db: tauri::State<'_, hypr_db::user::UserDatabase>,
    template: hypr_db::user::Template,
) -> Result<hypr_db::user::Template, String> {
    db.upsert_template(template)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(db))]
pub async fn delete_template(
    db: tauri::State<'_, hypr_db::user::UserDatabase>,
    id: String,
) -> Result<(), String> {
    db.delete_template(id).await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(db))]
pub async fn list_events(
    db: tauri::State<'_, hypr_db::user::UserDatabase>,
) -> Result<Vec<hypr_db::user::Event>, String> {
    db.list_events().await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(db))]
pub async fn list_sessions(
    db: tauri::State<'_, hypr_db::user::UserDatabase>,
    search: Option<&str>,
) -> Result<Vec<hypr_db::user::Session>, String> {
    db.list_sessions(search).await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(db))]
pub async fn get_session(
    db: tauri::State<'_, hypr_db::user::UserDatabase>,
    option: hypr_db::user::SessionFilter,
) -> Result<Option<hypr_db::user::Session>, String> {
    db.get_session(option).await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(db))]
pub async fn set_session_event(
    db: tauri::State<'_, hypr_db::user::UserDatabase>,
    session_id: String,
    event_id: String,
) -> Result<(), String> {
    db.session_set_event(session_id, event_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(db, state))]
pub async fn get_config(
    db: tauri::State<'_, hypr_db::user::UserDatabase>,
    state: tauri::State<'_, crate::ManagedState>,
) -> Result<hypr_db::user::Config, String> {
    let user_id = {
        let state = state.lock().unwrap();

        state
            .user_id
            .clone()
            .ok_or(crate::Error::NoneUser)
            .map_err(|e| e.to_string())?
    };

    let config = db.get_config(&user_id).await.map_err(|e| e.to_string())?;

    match config {
        Some(config) => Ok(config),
        None => {
            let config = hypr_db::user::Config {
                id: uuid::Uuid::new_v4().to_string(),
                user_id,
                general: hypr_db::user::ConfigGeneral::default(),
                notification: hypr_db::user::ConfigNotification::default(),
                ai: hypr_db::user::ConfigAI::default(),
            };
            Ok(config)
        }
    }
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(db))]
pub async fn set_config(
    db: tauri::State<'_, hypr_db::user::UserDatabase>,
    config: hypr_db::user::Config,
) -> Result<(), String> {
    db.set_config(config).await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(db, state))]
pub async fn get_self_human(
    db: tauri::State<'_, hypr_db::user::UserDatabase>,
    state: tauri::State<'_, crate::ManagedState>,
) -> Result<hypr_db::user::Human, String> {
    let user_id = {
        let state = state.lock().unwrap();

        state
            .user_id
            .clone()
            .ok_or(crate::Error::NoneUser)
            .map_err(|e| e.to_string())?
    };

    let human = db.get_human(user_id).await.map_err(|e| e.to_string())?;
    Ok(human)
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(db))]
pub async fn upsert_human(
    db: tauri::State<'_, hypr_db::user::UserDatabase>,
    human: hypr_db::user::Human,
) -> Result<hypr_db::user::Human, String> {
    db.upsert_human(human).await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(db, state))]
pub async fn get_self_organization(
    db: tauri::State<'_, hypr_db::user::UserDatabase>,
    state: tauri::State<'_, crate::ManagedState>,
) -> Result<hypr_db::user::Organization, String> {
    let user_id = {
        let state = state.lock().unwrap();

        state
            .user_id
            .clone()
            .ok_or(crate::Error::NoneUser)
            .map_err(|e| e.to_string())?
    };

    let organization = db
        .get_organization_by_user_id(user_id)
        .await
        .map_err(|e| e.to_string())?
        .unwrap();

    Ok(organization)
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(db))]
pub async fn upsert_organization(
    db: tauri::State<'_, hypr_db::user::UserDatabase>,
    organization: hypr_db::user::Organization,
) -> Result<hypr_db::user::Organization, String> {
    db.upsert_organization(organization)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(db))]
pub async fn list_chat_groups(
    db: tauri::State<'_, hypr_db::user::UserDatabase>,
    user_id: String,
) -> Result<Vec<hypr_db::user::ChatGroup>, String> {
    db.list_chat_groups(user_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(db))]
pub async fn list_chat_messages(
    db: tauri::State<'_, hypr_db::user::UserDatabase>,
    group_id: String,
) -> Result<Vec<hypr_db::user::ChatMessage>, String> {
    db.list_chat_messages(group_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(db))]
pub async fn create_chat_group(
    db: tauri::State<'_, hypr_db::user::UserDatabase>,
    group: hypr_db::user::ChatGroup,
) -> Result<hypr_db::user::ChatGroup, String> {
    db.create_chat_group(group).await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(db))]
pub async fn upsert_chat_message(
    db: tauri::State<'_, hypr_db::user::UserDatabase>,
    message: hypr_db::user::ChatMessage,
) -> Result<hypr_db::user::ChatMessage, String> {
    db.upsert_chat_message(message)
        .await
        .map_err(|e| e.to_string())
}
