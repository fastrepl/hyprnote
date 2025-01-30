pub mod db;

use crate::{audio, session::SessionState, windows::ShowHyprWindow, App};
use anyhow::Result;
use futures_util::StreamExt;
use std::path::PathBuf;
use tauri::{ipc::Channel, AppHandle, Manager, State};

#[tauri::command]
#[specta::specta]
pub fn get_env(name: &str) -> String {
    std::env::var(String::from(name)).unwrap_or(String::from(""))
}

#[tauri::command]
#[specta::specta]
pub fn get_fingerprint() -> String {
    hypr_host::fingerprint()
}

#[tauri::command]
#[specta::specta]
pub fn show_window(app: AppHandle, window: ShowHyprWindow) {
    window.show(&app).unwrap();
}

#[tauri::command]
#[specta::specta]
pub fn list_builtin_templates() -> Vec<hypr_db::user::Template> {
    hypr_template::builtins()
}

#[tauri::command]
#[specta::specta]
pub async fn start_session<'a>(
    app_handle: tauri::AppHandle,
    session: State<'_, tokio::sync::Mutex<SessionState>>,
    on_event: Channel<hypr_bridge::ListenOutputChunk>,
) -> Result<(), String> {
    let app_dir = app_handle.path().app_data_dir().unwrap();
    {
        let mut s = session.lock().await;
        let _ = s.start(app_dir, "123".to_string(), on_event).await;
    }
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn stop_session(
    session: State<'_, tokio::sync::Mutex<SessionState>>,
) -> Result<(), String> {
    {
        let mut s = session.lock().await;
        s.stop().await;
    }
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn run_enhance<'a>(
    app: State<'a, App>,
    req: hypr_bridge::EnhanceRequest,
    on_event: Channel<String>,
) -> Result<(), String> {
    let mut stream = app.bridge.enhance(req).await.map_err(|e| e.to_string())?;

    while let Some(event) = stream.next().await {
        if let Ok(event) = event {
            let s = String::from_utf8(event.to_vec()).unwrap();
            on_event.send(s).unwrap();
        }
    }

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn start_playback(_app: AppHandle, _audio_id: String) {}

#[tauri::command]
#[specta::specta]
pub async fn stop_playback(_app: AppHandle, _audio_id: String) {}

#[tauri::command]
#[specta::specta]
pub fn start_recording(app: AppHandle) -> Result<(), String> {
    audio::AppSounds::StartRecording.play();

    let id = uuid::Uuid::new_v4().to_string();

    let recording_dir = app
        .path()
        .app_data_dir()
        .unwrap()
        .join("sessions")
        .join(format!("{id}.hypr"));

    std::fs::create_dir_all(&recording_dir).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn stop_recording() {
    audio::AppSounds::StopRecording.play();
}

#[tauri::command]
#[specta::specta]
pub fn list_recordings(app: AppHandle) -> Result<Vec<(String, PathBuf)>, String> {
    let recordings_dir = recordings_path(&app);

    if !recordings_dir.exists() {
        return Ok(Vec::new());
    }

    Ok(Vec::new())
}

fn recordings_path(app: &AppHandle) -> PathBuf {
    let path = app.path().app_data_dir().unwrap().join("recordings");
    std::fs::create_dir_all(&path).unwrap_or_default();
    path
}

fn recording_path(app: &AppHandle, recording_id: &str) -> PathBuf {
    recordings_path(app).join(format!("{}.cap", recording_id))
}
