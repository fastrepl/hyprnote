#[tauri::command]
#[specta::specta]
pub async fn ping<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    payload: String,
) -> Result<String, String> {
    Ok(payload)
}
