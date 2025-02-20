#[tauri::command]
#[specta::specta]
#[tracing::instrument]
pub async fn ping(payload: String) -> Result<String, String> {
    Ok(payload)
}
