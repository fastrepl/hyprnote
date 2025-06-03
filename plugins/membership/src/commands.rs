#[tauri::command]
#[specta::specta]
pub(crate) async fn check<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<String, String> {
    Ok("pong".to_string())
}
