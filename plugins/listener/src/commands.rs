use crate::{ListenerPluginExt, SessionEvent};

#[tauri::command]
#[specta::specta]
pub async fn request_microphone_access<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<bool, String> {
    app.request_microphone_access().await
}

#[tauri::command]
#[specta::specta]
pub async fn request_system_audio_access<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<bool, String> {
    app.request_system_audio_access().await
}

#[tauri::command]
#[specta::specta]
pub async fn open_microphone_access_settings<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<(), String> {
    app.open_microphone_access_settings().await
}

#[tauri::command]
#[specta::specta]
pub async fn open_system_audio_access_settings<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<(), String> {
    app.open_system_audio_access_settings().await
}

#[tauri::command]
#[specta::specta]
pub async fn get_timeline<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    filter: crate::TimelineFilter,
) -> Result<crate::TimelineView, String> {
    let timeline = app.get_timeline(filter).await;
    Ok(timeline)
}

#[tauri::command]
#[specta::specta]
pub async fn subscribe<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    channel: tauri::ipc::Channel<SessionEvent>,
) -> Result<(), String> {
    app.subscribe(channel).await;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn unsubscribe<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    channel: tauri::ipc::Channel<SessionEvent>,
) -> Result<(), String> {
    app.unsubscribe(channel).await;
    Ok(())
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
