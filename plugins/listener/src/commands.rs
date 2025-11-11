use crate::ListenerPluginExt;

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
pub async fn list_speaker_devices<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Vec<String>, String> {
    app.list_speaker_devices().await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_current_microphone_device<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Option<String>, String> {
    app.get_current_microphone_device()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_current_speaker_device<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Option<String>, String> {
    app.get_current_speaker_device()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn set_microphone_device<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    device_name: String,
) -> Result<(), String> {
    app.set_microphone_device(device_name)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn set_speaker_device<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    device_name: String,
) -> Result<(), String> {
    app.set_speaker_device(device_name)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn set_default_speaker_device<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<(), String> {
    app.set_default_speaker_device()
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

#[tauri::command]
#[specta::specta]
pub async fn get_audio_gains<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<AudioGains, String> {
    use tauri::Manager;
    use tauri_plugin_db::DatabasePluginExt;

    let user_id = app
        .db_user_id()
        .await
        .map_err(|e| e.to_string())?
        .ok_or("No user ID found")?;

    let db_state: tauri::State<'_, hypr_db_user::UserDatabase> = app.state();
    let config = db_state
        .get_config(&user_id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or("Config not found")?;

    Ok(AudioGains {
        pre_mic_gain: config.audio.pre_mic_gain.unwrap_or(1.0),
        post_mic_gain: config.audio.post_mic_gain.unwrap_or(1.5),
        pre_speaker_gain: config.audio.pre_speaker_gain.unwrap_or(0.8),
        post_speaker_gain: config.audio.post_speaker_gain.unwrap_or(1.0),
    })
}

#[tauri::command]
#[specta::specta]
pub async fn set_audio_gains<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    gains: AudioGains,
) -> Result<(), String> {
    use tauri::Manager;
    use tauri_plugin_db::DatabasePluginExt;

    let user_id = app
        .db_user_id()
        .await
        .map_err(|e| e.to_string())?
        .ok_or("No user ID found")?;

    let db_state: tauri::State<'_, hypr_db_user::UserDatabase> = app.state();
    let mut config = db_state
        .get_config(&user_id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or("Config not found")?;

    config.audio.pre_mic_gain = Some(gains.pre_mic_gain);
    config.audio.post_mic_gain = Some(gains.post_mic_gain);
    config.audio.pre_speaker_gain = Some(gains.pre_speaker_gain);
    config.audio.post_speaker_gain = Some(gains.post_speaker_gain);

    db_state
        .set_config(config)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct AudioGains {
    pub pre_mic_gain: f32,
    pub post_mic_gain: f32,
    pub pre_speaker_gain: f32,
    pub post_speaker_gain: f32,
}
