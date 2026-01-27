use crate::FlagPluginExt;

#[tauri::command]
#[specta::specta]
pub(crate) async fn is_enabled<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    feature: String,
) -> Result<bool, String> {
    Ok(app.flag().is_enabled(&feature))
}
