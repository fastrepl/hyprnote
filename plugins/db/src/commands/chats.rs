#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn list_chat_groups(
    state: tauri::State<'_, crate::ManagedState>,
    session_id: String,
) -> Result<Vec<hypr_db_user::ChatGroup>, String> {
    let guard = state.lock().await;

    let db = guard
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDatabase)
        .map_err(|e| e.to_string())?;

    db.list_chat_groups(session_id)
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
    let guard = state.lock().await;

    let db = guard
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDatabase)
        .map_err(|e| e.to_string())?;

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
    let guard = state.lock().await;

    let db = guard
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDatabase)
        .map_err(|e| e.to_string())?;

    db.create_chat_group(group).await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn upsert_chat_message(
    state: tauri::State<'_, crate::ManagedState>,
    message: hypr_db_user::ChatMessage,
) -> Result<hypr_db_user::ChatMessage, String> {
    let guard = state.lock().await;

    let db = guard
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDatabase)
        .map_err(|e| e.to_string())?;

    db.upsert_chat_message(message)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn delete_chat_messages(
    state: tauri::State<'_, crate::ManagedState>,
    group_id: String,
) -> Result<(), String> {
    let guard = state.lock().await;

    let db = guard
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDatabase)
        .map_err(|e| e.to_string())?;

    db.delete_chat_messages(group_id)
        .await
        .map_err(|e| e.to_string())
}
