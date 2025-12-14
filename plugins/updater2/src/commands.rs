use crate::Updater2PluginExt;

#[tauri::command]
#[specta::specta]
pub(crate) async fn ping<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    app.ping().map_err(|e| e.to_string())
}
