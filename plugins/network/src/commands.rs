use tauri::{AppHandle, Runtime};

#[tauri::command]
#[specta::specta]
pub async fn is_online<R: Runtime>(_app: AppHandle<R>) -> Result<bool, String> {
    Ok(hypr_network::is_online().await)
}
