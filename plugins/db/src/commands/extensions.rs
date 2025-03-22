#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn upsert_extension_mapping(
    state: tauri::State<'_, crate::ManagedState>,
    mapping: hypr_db_user::ExtensionMapping,
) -> Result<hypr_db_user::ExtensionMapping, String> {
    let guard = state.lock().await;

    let db = guard
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDatabase)
        .map_err(|e| e.to_string())?;

    db.upsert_extension_mapping(mapping)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn get_extension_mapping(
    state: tauri::State<'_, crate::ManagedState>,
    user_id: String,
    extension_id: String,
) -> Result<Option<hypr_db_user::ExtensionMapping>, String> {
    let guard = state.lock().await;

    let db = guard
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDatabase)
        .map_err(|e| e.to_string())?;

    db.get_extension_mapping(user_id, extension_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip(state))]
pub async fn list_extension_mappings(
    state: tauri::State<'_, crate::ManagedState>,
    user_id: String,
) -> Result<Vec<hypr_db_user::ExtensionMapping>, String> {
    let guard = state.lock().await;

    let db = guard
        .db
        .as_ref()
        .ok_or(crate::Error::NoneDatabase)
        .map_err(|e| e.to_string())?;

    db.list_extension_mappings(user_id)
        .await
        .map_err(|e| e.to_string())
}
