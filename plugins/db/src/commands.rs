type DBState = crate::Mutex<crate::State>;

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn list_calendars(
    state: tauri::State<'_, DBState>,
) -> Result<Vec<hypr_db::user::Calendar>, String> {
    let state = state.lock().await;

    state
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDB)
        .map_err(|e| e.to_string())?
        .list_calendars()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn list_participants(
    state: tauri::State<'_, DBState>,
    event_id: String,
) -> Result<Vec<hypr_db::user::Human>, String> {
    let state = state.lock().await;

    state
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDB)
        .map_err(|e| e.to_string())?
        .list_participants(event_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn upsert_calendar(
    state: tauri::State<'_, DBState>,
    calendar: hypr_db::user::Calendar,
) -> Result<hypr_db::user::Calendar, String> {
    let state = state.lock().await;

    state
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDB)
        .map_err(|e| e.to_string())?
        .upsert_calendar(calendar)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn upsert_session(
    state: tauri::State<'_, DBState>,
    session: hypr_db::user::Session,
) -> Result<hypr_db::user::Session, String> {
    let state = state.lock().await;

    state
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDB)
        .map_err(|e| e.to_string())?
        .upsert_session(session)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn list_templates(
    state: tauri::State<'_, DBState>,
) -> Result<Vec<hypr_db::user::Template>, String> {
    let state = state.lock().await;

    let user_id = state
        .user_id
        .as_ref()
        .ok_or(crate::Error::NoneUser)
        .map_err(|e| e.to_string())?;

    state
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDB)
        .map_err(|e| e.to_string())?
        .list_templates(user_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn upsert_template(
    state: tauri::State<'_, DBState>,
    template: hypr_db::user::Template,
) -> Result<hypr_db::user::Template, String> {
    let state = state.lock().await;

    state
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDB)
        .map_err(|e| e.to_string())?
        .upsert_template(template)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn delete_template(state: tauri::State<'_, DBState>, id: String) -> Result<(), String> {
    let state = state.lock().await;

    state
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDB)
        .map_err(|e| e.to_string())?
        .delete_template(id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn list_events(
    state: tauri::State<'_, DBState>,
) -> Result<Vec<hypr_db::user::Event>, String> {
    let state = state.lock().await;

    state
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDB)
        .map_err(|e| e.to_string())?
        .list_events()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn list_sessions(
    state: tauri::State<'_, DBState>,
    search: Option<&str>,
) -> Result<Vec<hypr_db::user::Session>, String> {
    let state = state.lock().await;

    state
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDB)
        .map_err(|e| e.to_string())?
        .list_sessions(search)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn get_session(
    state: tauri::State<'_, DBState>,
    option: hypr_db::user::SessionFilter,
) -> Result<Option<hypr_db::user::Session>, String> {
    let state = state.lock().await;

    state
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDB)
        .map_err(|e| e.to_string())?
        .get_session(option)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn set_session_event(
    state: tauri::State<'_, DBState>,
    session_id: String,
    event_id: String,
) -> Result<(), String> {
    let state = state.lock().await;

    state
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDB)
        .map_err(|e| e.to_string())?
        .session_set_event(session_id, event_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn get_config(state: tauri::State<'_, DBState>) -> Result<hypr_db::user::Config, String> {
    let state = state.lock().await;

    let user_id = state
        .user_id
        .as_ref()
        .ok_or(crate::Error::NoneUser)
        .map_err(|e| e.to_string())?;

    let config = state
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDB)
        .map_err(|e| e.to_string())?
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
    state: tauri::State<'_, DBState>,
    config: hypr_db::user::Config,
) -> Result<(), String> {
    let state = state.lock().await;

    state
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDB)
        .map_err(|e| e.to_string())?
        .set_config(config)
        .await
        .map_err(|e| e.to_string())
}
#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn get_self_human(
    state: tauri::State<'_, DBState>,
) -> Result<hypr_db::user::Human, String> {
    let state = state.lock().await;

    let user_id = state
        .user_id
        .as_ref()
        .ok_or(crate::Error::NoneUser)
        .map_err(|e| e.to_string())?;

    let human = state
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDB)
        .map_err(|e| e.to_string())?
        .get_human(user_id)
        .await
        .map_err(|e| e.to_string())?;

    Ok(human)
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn upsert_human(
    state: tauri::State<'_, DBState>,
    human: hypr_db::user::Human,
) -> Result<hypr_db::user::Human, String> {
    let state = state.lock().await;

    state
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDB)
        .map_err(|e| e.to_string())?
        .upsert_human(human)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn get_self_organization(
    state: tauri::State<'_, DBState>,
) -> Result<hypr_db::user::Organization, String> {
    let state = state.lock().await;

    let user_id = state
        .user_id
        .as_ref()
        .ok_or(crate::Error::NoneUser)
        .map_err(|e| e.to_string())?;

    let organization = state
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDB)
        .map_err(|e| e.to_string())?
        .get_organization_by_user_id(user_id)
        .await
        .map_err(|e| e.to_string())?
        .unwrap();

    Ok(organization)
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn upsert_organization(
    state: tauri::State<'_, DBState>,
    organization: hypr_db::user::Organization,
) -> Result<hypr_db::user::Organization, String> {
    let state = state.lock().await;

    state
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDB)
        .map_err(|e| e.to_string())?
        .upsert_organization(organization)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn list_chat_groups(
    state: tauri::State<'_, DBState>,
    user_id: String,
) -> Result<Vec<hypr_db::user::ChatGroup>, String> {
    let state = state.lock().await;

    state
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDB)
        .map_err(|e| e.to_string())?
        .list_chat_groups(user_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn list_chat_messages(
    state: tauri::State<'_, DBState>,
    group_id: String,
) -> Result<Vec<hypr_db::user::ChatMessage>, String> {
    let state = state.lock().await;

    state
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDB)
        .map_err(|e| e.to_string())?
        .list_chat_messages(group_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn create_chat_group(
    state: tauri::State<'_, DBState>,
    group: hypr_db::user::ChatGroup,
) -> Result<hypr_db::user::ChatGroup, String> {
    let state = state.lock().await;

    state
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDB)
        .map_err(|e| e.to_string())?
        .create_chat_group(group)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn upsert_chat_message(
    state: tauri::State<'_, DBState>,
    message: hypr_db::user::ChatMessage,
) -> Result<hypr_db::user::ChatMessage, String> {
    let state = state.lock().await;

    state
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDB)
        .map_err(|e| e.to_string())?
        .upsert_chat_message(message)
        .await
        .map_err(|e| e.to_string())
}
