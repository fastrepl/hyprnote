#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn list_calendars(
    state: tauri::State<'_, crate::State>,
) -> Result<Vec<hypr_db::user::Calendar>, String> {
    state.db.list_calendars().await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn list_participants(
    state: tauri::State<'_, crate::State>,
    event_id: String,
) -> Result<Vec<hypr_db::user::Human>, String> {
    state
        .db
        .list_participants(event_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn upsert_calendar(
    state: tauri::State<'_, crate::State>,
    calendar: hypr_db::user::Calendar,
) -> Result<hypr_db::user::Calendar, String> {
    state
        .db
        .upsert_calendar(calendar)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn upsert_session(
    state: tauri::State<'_, crate::State>,
    session: hypr_db::user::Session,
) -> Result<hypr_db::user::Session, String> {
    state
        .db
        .upsert_session(session)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn list_templates(
    state: tauri::State<'_, crate::State>,
) -> Result<Vec<hypr_db::user::Template>, String> {
    let user_id = &state.user_id;
    state
        .db
        .list_templates(user_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn upsert_template(
    state: tauri::State<'_, crate::State>,
    template: hypr_db::user::Template,
) -> Result<hypr_db::user::Template, String> {
    state
        .db
        .upsert_template(template)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn delete_template(
    state: tauri::State<'_, crate::State>,
    id: String,
) -> Result<(), String> {
    state
        .db
        .delete_template(id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn list_events(
    state: tauri::State<'_, crate::State>,
) -> Result<Vec<hypr_db::user::Event>, String> {
    state.db.list_events().await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn list_sessions(
    state: tauri::State<'_, crate::State>,
    search: Option<&str>,
) -> Result<Vec<hypr_db::user::Session>, String> {
    state
        .db
        .list_sessions(search)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn get_session(
    state: tauri::State<'_, crate::State>,
    option: hypr_db::user::SessionFilter,
) -> Result<Option<hypr_db::user::Session>, String> {
    state
        .db
        .get_session(option)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn set_session_event(
    state: tauri::State<'_, crate::State>,
    session_id: String,
    event_id: String,
) -> Result<(), String> {
    state
        .db
        .session_set_event(session_id, event_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn get_config(
    state: tauri::State<'_, crate::State>,
) -> Result<hypr_db::user::Config, String> {
    let user_id = &state.user_id;
    let config = state
        .db
        .get_config(user_id)
        .await
        .map_err(|e| e.to_string())?;

    match config {
        Some(config) => Ok(config),
        None => {
            let config = hypr_db::user::Config {
                id: uuid::Uuid::new_v4().to_string(),
                user_id: user_id.to_string(),
                general: hypr_db::user::ConfigGeneral::default(),
                notification: hypr_db::user::ConfigNotification::default(),
            };
            Ok(config)
        }
    }
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn set_config(
    state: tauri::State<'_, crate::State>,
    config: hypr_db::user::Config,
) -> Result<(), String> {
    state.db.set_config(config).await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn get_self_human(
    state: tauri::State<'_, crate::State>,
) -> Result<hypr_db::user::Human, String> {
    let user_id = &state.user_id;
    let human = state
        .db
        .get_human(user_id)
        .await
        .map_err(|e| e.to_string())?;
    Ok(human)
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn upsert_human(
    state: tauri::State<'_, crate::State>,
    human: hypr_db::user::Human,
) -> Result<hypr_db::user::Human, String> {
    state
        .db
        .upsert_human(human)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn get_self_organization(
    state: tauri::State<'_, crate::State>,
) -> Result<hypr_db::user::Organization, String> {
    let user_id = &state.user_id;
    let organization = state
        .db
        .get_organization_by_user_id(user_id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or("Organization not found".to_string())?;

    Ok(organization)
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn upsert_organization(
    state: tauri::State<'_, crate::State>,
    organization: hypr_db::user::Organization,
) -> Result<hypr_db::user::Organization, String> {
    state
        .db
        .upsert_organization(organization)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn list_chat_groups(
    state: tauri::State<'_, crate::State>,
    user_id: String,
) -> Result<Vec<hypr_db::user::ChatGroup>, String> {
    state
        .db
        .list_chat_groups(user_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn list_chat_messages(
    state: tauri::State<'_, crate::State>,
    group_id: String,
) -> Result<Vec<hypr_db::user::ChatMessage>, String> {
    state
        .db
        .list_chat_messages(group_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn create_chat_group(
    state: tauri::State<'_, crate::State>,
    group: hypr_db::user::ChatGroup,
) -> Result<hypr_db::user::ChatGroup, String> {
    state
        .db
        .create_chat_group(group)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn upsert_chat_message(
    state: tauri::State<'_, crate::State>,
    message: hypr_db::user::ChatMessage,
) -> Result<hypr_db::user::ChatMessage, String> {
    state
        .db
        .upsert_chat_message(message)
        .await
        .map_err(|e| e.to_string())
}
