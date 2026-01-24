use crate::ScreenPluginExt;

#[tauri::command]
#[specta::specta]
pub(crate) async fn ping<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<String, String> {
    app.screen().ping().map_err(|e| e.to_string())
}
