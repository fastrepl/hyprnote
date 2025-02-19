#[tauri::command]
#[specta::specta]
pub(crate) async fn ping(payload: String) -> Result<String, String> {
    Ok(payload)
}
