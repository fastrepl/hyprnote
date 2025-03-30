use crate::{ListenerPluginExt, SessionEvent};
use hypr_timeline::{Timeline, TimelineFilter, TimelineView};

#[tauri::command]
#[specta::specta]
pub async fn request_microphone_access<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<bool, String> {
    app.request_microphone_access()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn request_system_audio_access<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<bool, String> {
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
pub async fn get_timeline<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    db_plugin_state: tauri::State<'_, tauri_plugin_db::ManagedState>,
    session_id: String,
    filter: TimelineFilter,
) -> Result<TimelineView, String> {
    let (requested_session, onboarding_session_id) = {
        let state = db_plugin_state.lock().await;

        let requested_session = state
            .db
            .as_ref()
            .unwrap()
            .get_session(hypr_db_user::GetSessionFilter::Id(session_id))
            .await
            .map_err(|e| e.to_string())?
            .unwrap();

        let onboarding_session_id = state.db.as_ref().unwrap().onboarding_session_id();

        (requested_session, onboarding_session_id)
    };

    if requested_session.id == onboarding_session_id {
        let (transcripts, diarizations): (
            Vec<hypr_listener_interface::TranscriptChunk>,
            Vec<hypr_listener_interface::DiarizationChunk>,
        ) = (
            serde_json::from_str(hypr_data::english_3::TRANSCRIPTION_JSON).unwrap(),
            serde_json::from_str(hypr_data::english_3::DIARIZATION_JSON).unwrap(),
        );

        let mut timeline = Timeline::default();

        for t in transcripts {
            timeline.add_transcription(t);
        }
        for d in diarizations {
            timeline.add_diarization(d);
        }

        return Ok(timeline.view(filter));
    }

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
pub async fn start_session<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    session_id: String,
) -> Result<(), String> {
    app.start_session(session_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn stop_session<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    app.stop_session().await.map_err(|e| e.to_string())
}
