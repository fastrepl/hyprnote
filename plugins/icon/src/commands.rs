use crate::IconPluginExt;

#[tauri::command]
#[specta::specta]
pub(crate) async fn set_dock_icon<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    name: String,
) -> Result<(), String> {
    app.icon().set_dock_icon(name).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn reset_dock_icon<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<(), String> {
    app.icon().reset_dock_icon().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn get_icon<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Option<String>, String> {
    app.icon().get_icon().map_err(|e| e.to_string())
}
