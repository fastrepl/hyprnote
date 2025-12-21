use crate::Cli2PluginExt;

#[tauri::command]
#[specta::specta]
pub(crate) async fn install_cli<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    app.cli2().install_cli_to_path().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn uninstall_cli<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<(), String> {
    app.cli2()
        .uninstall_cli_from_path()
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn check_cli_status<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<crate::CliStatus, String> {
    app.cli2().check_cli_status().map_err(|e| e.to_string())
}
