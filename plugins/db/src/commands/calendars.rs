#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn get_calendar(
    state: tauri::State<'_, crate::ManagedState>,
    calendar_id: String,
) -> Result<Option<hypr_db_user::Calendar>, String> {
    let guard = state.lock().await;

    let db = guard
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDatabase)
        .map_err(|e| e.to_string())?;

    db.get_calendar(&calendar_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn list_calendars(
    state: tauri::State<'_, crate::ManagedState>,
    user_id: String,
) -> Result<Vec<hypr_db_user::Calendar>, String> {
    let guard = state.lock().await;

    let db = guard
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDatabase)
        .map_err(|e| e.to_string())?;

    db.list_calendars(&user_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn upsert_calendar(
    state: tauri::State<'_, crate::ManagedState>,
    calendar: hypr_db_user::Calendar,
) -> Result<hypr_db_user::Calendar, String> {
    let guard = state.lock().await;

    let db = guard
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDatabase)
        .map_err(|e| e.to_string())?;

    db.upsert_calendar(calendar)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn toggle_calendar_selected(
    state: tauri::State<'_, crate::ManagedState>,
    tracking_id: String,
) -> Result<hypr_db_user::Calendar, String> {
    let guard = state.lock().await;

    let db = guard
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDatabase)
        .map_err(|e| e.to_string())?;

    db.toggle_calendar_selected(tracking_id)
        .await
        .map_err(|e| e.to_string())
}
