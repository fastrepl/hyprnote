use crate::Path2PluginExt;

#[tauri::command]
#[specta::specta]
pub(crate) fn base<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<String, String> {
    app.path2()
        .base()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| e.to_string())
}
