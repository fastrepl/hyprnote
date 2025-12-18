use crate::Updater2PluginExt;

#[tauri::command]
#[specta::specta]
pub(crate) async fn get_pending_update<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Option<String>, String> {
    app.updater2()
        .get_pending_update_version()
        .map_err(|e| e.to_string())
}
