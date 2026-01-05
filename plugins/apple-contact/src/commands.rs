use crate::{AppleContactPluginExt, ImportResult};

#[tauri::command]
#[specta::specta]
pub(crate) async fn import<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<ImportResult, String> {
    app.apple_contact().import().map_err(|e| e.to_string())
}
