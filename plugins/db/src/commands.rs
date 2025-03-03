#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn list_calendars(
    state: tauri::State<'_, crate::ManagedState>,
) -> Result<Vec<hypr_db_user::Calendar>, String> {
    let db = {
        let s = state.lock().unwrap();
        s.db.clone()
            .ok_or(crate::Error::NoneDatabase)
            .map_err(|e| e.to_string())?
    };

    db.list_calendars().await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn list_participants(
    state: tauri::State<'_, crate::ManagedState>,
    event_id: String,
) -> Result<Vec<hypr_db_user::Human>, String> {
    let db = {
        let s = state.lock().unwrap();
        s.db.clone()
            .ok_or(crate::Error::NoneDatabase)
            .map_err(|e| e.to_string())?
    };

    db.list_participants(event_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn upsert_calendar(
    state: tauri::State<'_, crate::ManagedState>,
    calendar: hypr_db_user::Calendar,
) -> Result<hypr_db_user::Calendar, String> {
    let db = {
        let s = state.lock().unwrap();
        s.db.clone()
            .ok_or(crate::Error::NoneDatabase)
            .map_err(|e| e.to_string())?
    };

    db.upsert_calendar(calendar)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn upsert_session(
    state: tauri::State<'_, crate::ManagedState>,
    session: hypr_db_user::Session,
) -> Result<hypr_db_user::Session, String> {
    let db = {
        let s = state.lock().unwrap();
        s.db.clone()
            .ok_or(crate::Error::NoneDatabase)
            .map_err(|e| e.to_string())?
    };

    db.upsert_session(session).await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn list_templates(
    state: tauri::State<'_, crate::ManagedState>,
) -> Result<Vec<hypr_db_user::Template>, String> {
    let (db, user_id) = {
        let s = state.lock().unwrap();

        let db =
            s.db.clone()
                .ok_or(crate::Error::NoneDatabase)
                .map_err(|e| e.to_string())?;

        let user_id = s
            .user_id
            .clone()
            .ok_or(crate::Error::NoneUser)
            .map_err(|e| e.to_string())?;

        (db, user_id)
    };

    db.list_templates(user_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn upsert_template(
    state: tauri::State<'_, crate::ManagedState>,
    template: hypr_db_user::Template,
) -> Result<hypr_db_user::Template, String> {
    let db = {
        let s = state.lock().unwrap();
        s.db.clone()
            .ok_or(crate::Error::NoneDatabase)
            .map_err(|e| e.to_string())?
    };

    db.upsert_template(template)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn delete_template(
    state: tauri::State<'_, crate::ManagedState>,
    id: String,
) -> Result<(), String> {
    let db = {
        let s = state.lock().unwrap();
        s.db.clone()
            .ok_or(crate::Error::NoneDatabase)
            .map_err(|e| e.to_string())?
    };

    db.delete_template(id).await.map_err(|e| e.to_string())
}
#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn list_events(
    state: tauri::State<'_, crate::ManagedState>,
) -> Result<Vec<hypr_db_user::Event>, String> {
    let db = {
        let s = state.lock().unwrap();
        s.db.clone()
            .ok_or(crate::Error::NoneDatabase)
            .map_err(|e| e.to_string())?
    };

    db.list_events().await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn list_sessions(
    state: tauri::State<'_, crate::ManagedState>,
    search: Option<&str>,
) -> Result<Vec<hypr_db_user::Session>, String> {
    let db = {
        let s = state.lock().unwrap();
        s.db.clone()
            .ok_or(crate::Error::NoneDatabase)
            .map_err(|e| e.to_string())?
    };

    db.list_sessions(search).await.map_err(|e| e.to_string())
}
#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn get_session(
    state: tauri::State<'_, crate::ManagedState>,
    option: hypr_db_user::SessionFilter,
) -> Result<Option<hypr_db_user::Session>, String> {
    let db = {
        let s = state.lock().unwrap();
        s.db.clone()
            .ok_or(crate::Error::NoneDatabase)
            .map_err(|e| e.to_string())?
    };

    db.get_session(option).await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn set_session_event(
    state: tauri::State<'_, crate::ManagedState>,
    session_id: String,
    event_id: String,
) -> Result<(), String> {
    let db = {
        let s = state.lock().unwrap();
        s.db.clone()
            .ok_or(crate::Error::NoneDatabase)
            .map_err(|e| e.to_string())?
    };

    db.session_set_event(session_id, event_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn get_config(
    state: tauri::State<'_, crate::ManagedState>,
) -> Result<hypr_db_user::Config, String> {
    let (db, user_id) = {
        let s = state.lock().unwrap();

        let db =
            s.db.clone()
                .ok_or(crate::Error::NoneDatabase)
                .map_err(|e| e.to_string())?;

        let user_id = s
            .user_id
            .clone()
            .ok_or(crate::Error::NoneUser)
            .map_err(|e| e.to_string())?;

        (db, user_id)
    };

    let config = db.get_config(&user_id).await.map_err(|e| e.to_string())?;

    match config {
        Some(config) => Ok(config),
        None => {
            let config = hypr_db_user::Config {
                id: uuid::Uuid::new_v4().to_string(),
                user_id,
                general: hypr_db_user::ConfigGeneral::default(),
                notification: hypr_db_user::ConfigNotification::default(),
                ai: hypr_db_user::ConfigAI::default(),
            };
            Ok(config)
        }
    }
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn set_config(
    state: tauri::State<'_, crate::ManagedState>,
    config: hypr_db_user::Config,
) -> Result<(), String> {
    let db = {
        let s = state.lock().unwrap();

        s.db.clone()
            .ok_or(crate::Error::NoneDatabase)
            .map_err(|e| e.to_string())?
    };

    db.set_config(config).await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn get_self_human(
    state: tauri::State<'_, crate::ManagedState>,
) -> Result<hypr_db_user::Human, String> {
    let (db, user_id) = {
        let s = state.lock().unwrap();

        let db =
            s.db.clone()
                .ok_or(crate::Error::NoneDatabase)
                .map_err(|e| e.to_string())?;

        let user_id = s
            .user_id
            .clone()
            .ok_or(crate::Error::NoneUser)
            .map_err(|e| e.to_string())?;

        (db, user_id)
    };

    let human = db.get_human(user_id).await.map_err(|e| e.to_string())?;
    Ok(human)
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn upsert_human(
    state: tauri::State<'_, crate::ManagedState>,
    human: hypr_db_user::Human,
) -> Result<hypr_db_user::Human, String> {
    let db = {
        let s = state.lock().unwrap();
        s.db.clone()
            .ok_or(crate::Error::NoneDatabase)
            .map_err(|e| e.to_string())?
    };

    db.upsert_human(human).await.map_err(|e| e.to_string())
}
#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn get_self_organization(
    state: tauri::State<'_, crate::ManagedState>,
) -> Result<hypr_db_user::Organization, String> {
    let (db, user_id) = {
        let s = state.lock().unwrap();

        let db =
            s.db.clone()
                .ok_or(crate::Error::NoneDatabase)
                .map_err(|e| e.to_string())?;

        let user_id = s
            .user_id
            .clone()
            .ok_or(crate::Error::NoneUser)
            .map_err(|e| e.to_string())?;

        (db, user_id)
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
#[tracing::instrument(skip(state))]
pub async fn upsert_organization(
    state: tauri::State<'_, crate::ManagedState>,
    organization: hypr_db_user::Organization,
) -> Result<hypr_db_user::Organization, String> {
    let db = {
        let s = state.lock().unwrap();
        s.db.clone()
            .ok_or(crate::Error::NoneDatabase)
            .map_err(|e| e.to_string())?
    };

    db.upsert_organization(organization)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn list_chat_groups(
    state: tauri::State<'_, crate::ManagedState>,
    user_id: String,
) -> Result<Vec<hypr_db_user::ChatGroup>, String> {
    let db = {
        let s = state.lock().unwrap();
        s.db.clone()
            .ok_or(crate::Error::NoneDatabase)
            .map_err(|e| e.to_string())?
    };

    db.list_chat_groups(user_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn list_chat_messages(
    state: tauri::State<'_, crate::ManagedState>,
    group_id: String,
) -> Result<Vec<hypr_db_user::ChatMessage>, String> {
    let db = {
        let s = state.lock().unwrap();
        s.db.clone()
            .ok_or(crate::Error::NoneDatabase)
            .map_err(|e| e.to_string())?
    };

    db.list_chat_messages(group_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn create_chat_group(
    state: tauri::State<'_, crate::ManagedState>,
    group: hypr_db_user::ChatGroup,
) -> Result<hypr_db_user::ChatGroup, String> {
    let db = {
        let s = state.lock().unwrap();
        s.db.clone()
            .ok_or(crate::Error::NoneDatabase)
            .map_err(|e| e.to_string())?
    };

    db.create_chat_group(group).await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn upsert_chat_message(
    state: tauri::State<'_, crate::ManagedState>,
    message: hypr_db_user::ChatMessage,
) -> Result<hypr_db_user::ChatMessage, String> {
    let db = {
        let s = state.lock().unwrap();
        s.db.clone()
            .ok_or(crate::Error::NoneDatabase)
            .map_err(|e| e.to_string())?
    };

    db.upsert_chat_message(message)
        .await
        .map_err(|e| e.to_string())
}
