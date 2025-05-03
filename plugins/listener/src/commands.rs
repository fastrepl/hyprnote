use crate::{ListenerPluginExt, SessionEvent};

#[tauri::command]
#[specta::specta]
pub async fn list_microphone_devices<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Vec<String>, String> {
    app.list_microphone_devices()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn check_microphone_access<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<bool, String> {
    app.check_microphone_access()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn check_system_audio_access<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<bool, String> {
    app.check_system_audio_access()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn request_microphone_access<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<(), String> {
    app.request_microphone_access()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn request_system_audio_access<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<(), String> {
    app.request_system_audio_access()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn open_microphone_access_settings<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<(), String> {
    app.open_microphone_access_settings()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn open_system_audio_access_settings<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<(), String> {
    app.open_system_audio_access_settings()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_mic_muted<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<bool, String> {
    Ok(app.get_mic_muted().await)
}

#[tauri::command]
#[specta::specta]
pub async fn get_speaker_muted<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<bool, String> {
    Ok(app.get_speaker_muted().await)
}

#[tauri::command]
#[specta::specta]
pub async fn set_mic_muted<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    muted: bool,
) -> Result<(), String> {
    app.set_mic_muted(muted).await;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn set_speaker_muted<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    muted: bool,
) -> Result<(), String> {
    app.set_speaker_muted(muted).await;
    Ok(())
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
pub async fn start_session<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    session_id: String,
) -> Result<(), String> {
    app.start_session(session_id).await;
    match app.get_state().await {
        crate::fsm::State::RunningActive { .. } => Ok(()),
        _ => Err(crate::Error::StartSessionFailed.to_string()),
    }
}

#[tauri::command]
#[specta::specta]
pub async fn stop_session<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    app.stop_session().await;
    match app.get_state().await {
        crate::fsm::State::Inactive { .. } => Ok(()),
        _ => Err(crate::Error::StopSessionFailed.to_string()),
    }
}

#[tauri::command]
#[specta::specta]
pub async fn pause_session<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    app.pause_session().await;
    match app.get_state().await {
        crate::fsm::State::RunningPaused { .. } => Ok(()),
        _ => Err(crate::Error::PauseSessionFailed.to_string()),
    }
}

#[tauri::command]
#[specta::specta]
pub async fn resume_session<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    app.resume_session().await;
    match app.get_state().await {
        crate::fsm::State::RunningActive { .. } => Ok(()),
        _ => Err(crate::Error::ResumeSessionFailed.to_string()),
    }
}

#[tauri::command]
#[specta::specta]
pub async fn get_state<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<crate::fsm::State, String> {
    Ok(app.get_state().await)
}
