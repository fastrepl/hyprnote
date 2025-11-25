use crate::ImporterPluginExt;

#[tauri::command]
#[specta::specta]
pub async fn ping<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<String, String> {
    app.ping()
}
