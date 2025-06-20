#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn list_all_tags(
    state: tauri::State<'_, crate::ManagedState>,
) -> Result<Vec<hypr_db_user::Tag>, String> {
    let guard = state.lock().await;

    let db = guard
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDatabase)
        .map_err(|e| e.to_string())?;

    db.list_all_tags().await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn list_session_tags(
    state: tauri::State<'_, crate::ManagedState>,
    session_id: String,
) -> Result<Vec<hypr_db_user::Tag>, String> {
    let guard = state.lock().await;

    let db = guard
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDatabase)
        .map_err(|e| e.to_string())?;

    db.list_session_tags(session_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn assign_tag_to_session(
    state: tauri::State<'_, crate::ManagedState>,
    tag_id: String,
    session_id: String,
) -> Result<(), String> {
    let guard = state.lock().await;

    let db = guard
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDatabase)
        .map_err(|e| e.to_string())?;

    db.assign_tag_to_session(tag_id, session_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn unassign_tag_from_session(
    state: tauri::State<'_, crate::ManagedState>,
    tag_id: String,
    session_id: String,
) -> Result<(), String> {
    let guard = state.lock().await;

    let db = guard
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDatabase)
        .map_err(|e| e.to_string())?;

    db.unassign_tag_from_session(tag_id, session_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn upsert_tag(
    state: tauri::State<'_, crate::ManagedState>,
    tag: hypr_db_user::Tag,
) -> Result<hypr_db_user::Tag, String> {
    let guard = state.lock().await;

    let db = guard
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDatabase)
        .map_err(|e| e.to_string())?;

    db.upsert_tag(tag).await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn delete_tag(
    state: tauri::State<'_, crate::ManagedState>,
    tag_id: String,
) -> Result<(), String> {
    let guard = state.lock().await;

    let db = guard
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDatabase)
        .map_err(|e| e.to_string())?;

    db.delete_tag(tag_id).await.map_err(|e| e.to_string())
}
