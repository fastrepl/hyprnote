use crate::{ListenerPluginExt, actors::SessionParams};

#[tauri::command]
#[specta::specta]
pub async fn list_microphone_devices<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Vec<String>, String> {
    app.listener()
        .list_microphone_devices()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_default_microphone_device<R: tauri::Runtime>(
    _app: tauri::AppHandle<R>,
) -> Result<String, String> {
    Ok(hypr_audio::AudioInput::get_default_device_name())
}

#[tauri::command]
#[specta::specta]
pub async fn get_current_microphone_device<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Option<String>, String> {
    app.listener()
        .get_current_microphone_device()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_mic_muted<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<bool, String> {
    Ok(app.listener().get_mic_muted().await)
}

#[tauri::command]
#[specta::specta]
pub async fn set_mic_muted<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    muted: bool,
) -> Result<(), String> {
    app.listener().set_mic_muted(muted).await;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn start_session<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    params: SessionParams,
) -> Result<(), String> {
    app.listener().start_session(params).await;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn stop_session<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    app.listener().stop_session().await;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn get_state<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<crate::fsm::State, String> {
    Ok(app.listener().get_state().await)
}
