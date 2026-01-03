use crate::TantivyPluginExt;

#[tauri::command]
#[specta::specta]
pub(crate) async fn ping<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    app.tantivy().ping().map_err(|e| e.to_string())
}
