#[tauri::command]
#[specta::specta]
pub(crate) async fn ping<R: tauri::Runtime>(_app: tauri::AppHandle<R>) -> Result<String, String> {
    Ok("pong".to_string())
}
