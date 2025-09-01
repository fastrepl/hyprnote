use crate::TracingPluginExt;

#[tauri::command]
#[specta::specta]
pub async fn hi<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    app.hi().map_err(|e| e.to_string())
}
