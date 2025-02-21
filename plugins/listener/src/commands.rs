use crate::{ListenerPluginExt, SessionEvent};

#[tauri::command]
#[specta::specta]
pub async fn get_timeline<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<hypr_bridge::TimelineView, String> {
    app.get_timeline().await
}

#[tauri::command]
#[specta::specta]
pub async fn subscribe<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    channel: tauri::ipc::Channel<SessionEvent>,
) -> Result<(), String> {
    app.subscribe(channel).await
}

#[tauri::command]
#[specta::specta]
pub async fn start_session<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<String, String> {
    app.start_session().await
}

#[tauri::command]
#[specta::specta]
pub async fn stop_session<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    app.stop_session().await
}
