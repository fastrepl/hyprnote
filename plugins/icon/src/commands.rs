use crate::IconPluginExt;

#[tauri::command]
#[specta::specta]
pub(crate) async fn set_dock_icon<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    name: String,
) -> Result<(), String> {
    app.set_dock_icon(name).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn reset_dock_icon<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<(), String> {
    app.reset_dock_icon().map_err(|e| e.to_string())
}
