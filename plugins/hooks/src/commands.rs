use crate::HooksPluginExt;

#[tauri::command]
#[specta::specta]
pub(crate) async fn ping<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    value: Option<String>,
) -> Result<Option<String>, String> {
    app.ping(value).map_err(|e| e.to_string())
}
