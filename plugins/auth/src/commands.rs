use crate::AuthPluginExt;

#[tauri::command]
#[specta::specta]
pub async fn start_oauth_server<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<u16, String> {
    app.start_oauth_server()
}

#[tauri::command]
#[specta::specta]
pub async fn cancel_oauth_server<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<(), String> {
    app.cancel_oauth_server()
}
