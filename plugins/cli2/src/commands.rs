use crate::CliPluginExt;

#[tauri::command]
#[specta::specta]
pub(crate) async fn install_cli<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    app.plugin_cli()
        .install_cli_to_path()
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn uninstall_cli<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<(), String> {
    app.plugin_cli()
        .uninstall_cli_from_path()
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn check_cli_status<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<crate::CliStatus, String> {
    app.plugin_cli()
        .check_cli_status()
        .map_err(|e| e.to_string())
}
