#[tauri::command]
#[specta::specta]
pub(crate) async fn install_cli<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    use crate::CliPluginExt;
    app.install_cli_to_path().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn uninstall_cli<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<(), String> {
    use crate::CliPluginExt;
    app.uninstall_cli_from_path().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn check_cli_status<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<crate::CliStatus, String> {
    use crate::CliPluginExt;
    app.check_cli_status().map_err(|e| e.to_string())
}
