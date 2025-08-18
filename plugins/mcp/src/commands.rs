use crate::McpPluginExt;

#[tauri::command]
#[specta::specta]
pub(crate) async fn get_servers<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Vec<crate::McpServer>, String> {
    app.get_servers().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn set_servers<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    servers: Vec<crate::McpServer>,
) -> Result<(), String> {
    app.set_servers(servers).map_err(|e| e.to_string())
}
