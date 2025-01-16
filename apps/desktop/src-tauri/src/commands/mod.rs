pub mod db;

use crate::{audio, events, session, windows::ShowHyprWindow, SessionState};
use anyhow::Result;
use std::path::PathBuf;
use tauri::{ipc::Channel, AppHandle, Manager};

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
pub fn create_session(_app: AppHandle) {}

#[tauri::command]
#[specta::specta]
pub async fn start_session(
    app: AppHandle,
    on_event: Channel<hypr_bridge::TranscribeOutputChunk>,
) -> Result<(), String> {
    let bridge = hypr_bridge::Client::builder()
        .with_base("http://localhost:1234")
        .with_token("123")
        .build()
        .unwrap();
    let mut s = session::SessionState::new(bridge).unwrap();
    s.start(on_event).await;
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

#[tauri::command]
#[specta::specta]
pub async fn stop_session(app: AppHandle) -> Result<(), String> {
    // Implementation to stop the session...
    Ok(())
}
