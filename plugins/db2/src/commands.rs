use crate::Database2PluginExt;

#[tauri::command]
#[specta::specta]
pub(crate) async fn execute_local<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    sql: String,
    args: Vec<String>,
) -> Result<Vec<serde_json::Value>, String> {
    app.execute_local(sql, args).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn execute_cloud<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    sql: String,
    args: Vec<String>,
) -> Result<Vec<serde_json::Value>, String> {
    app.execute_cloud(sql, args).map_err(|e| e.to_string())
}
