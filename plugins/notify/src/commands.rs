use crate::NotifyPluginExt;

#[tauri::command]
#[specta::specta]
pub(crate) async fn ping<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    app.notify().ping().map_err(|e| e.to_string())
}
