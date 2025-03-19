#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn get_human(
    state: tauri::State<'_, crate::ManagedState>,
    id: String,
) -> Result<Option<hypr_db_user::Human>, String> {
    let guard = state.lock().await;

    let db = guard
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDatabase)
        .map_err(|e| e.to_string())?;

    db.get_human(id).await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn upsert_human(
    state: tauri::State<'_, crate::ManagedState>,
    human: hypr_db_user::Human,
) -> Result<hypr_db_user::Human, String> {
    let guard = state.lock().await;

    let db = guard
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDatabase)
        .map_err(|e| e.to_string())?;

    db.upsert_human(human).await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn list_humans(
    state: tauri::State<'_, crate::ManagedState>,
    filter: Option<hypr_db_user::ListHumanFilter>,
) -> Result<Vec<hypr_db_user::Human>, String> {
    let guard = state.lock().await;

    let db = guard
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDatabase)
        .map_err(|e| e.to_string())?;

    db.list_humans(filter).await.map_err(|e| e.to_string())
}
