#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn get_event(
    state: tauri::State<'_, crate::ManagedState>,
    id: String,
) -> Result<Option<hypr_db_user::Event>, String> {
    let guard = state.lock().await;

    let db = guard
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDatabase)
        .map_err(|e| e.to_string())?;

    db.get_event(id).await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn list_events(
    state: tauri::State<'_, crate::ManagedState>,
    filter: Option<hypr_db_user::ListEventFilter>,
) -> Result<Vec<hypr_db_user::Event>, String> {
    let guard = state.lock().await;

    let db = guard
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDatabase)
        .map_err(|e| e.to_string())?;

    db.list_events(filter).await.map_err(|e| e.to_string())
}
