#[tauri::command]
#[specta::specta]
#[tracing::instrument]
pub async fn enhance(payload: String) -> Result<String, String> {
    Ok(payload)
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument]
pub async fn create_title(payload: String) -> Result<String, String> {
    Ok(payload)
}
