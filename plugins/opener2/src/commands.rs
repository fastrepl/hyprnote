use crate::Opener2PluginExt;

#[tauri::command]
#[specta::specta]
pub(crate) async fn ping<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<String, String> {
    app.opener2().ping().map_err(|e| e.to_string())
}
