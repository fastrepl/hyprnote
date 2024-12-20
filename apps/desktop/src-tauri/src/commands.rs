use crate::{audio, auth::AuthStore, config::ConfigStore, permissions};
use anyhow::Result;
use cap_media::feeds::AudioInputFeed;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[tauri::command]
#[specta::specta]
pub async fn list_audio_devices() -> Result<Vec<String>, ()> {
    if !permissions::do_permissions_check(false)
        .microphone
        .permitted()
    {
        return Ok(vec![]);
    }

    Ok(AudioInputFeed::list_devices().keys().cloned().collect())
}

#[tauri::command]
#[specta::specta]
pub async fn start_playback(_app: AppHandle, _audio_id: String) {}

#[tauri::command]
#[specta::specta]
pub async fn stop_playback(_app: AppHandle, _audio_id: String) {}

#[cfg(target_os = "macos")]
#[tauri::command]
#[specta::specta]
pub fn list_apple_calendars() -> Option<Vec<hypr_calendar::apple::Calendar>> {
    let handle = hypr_calendar::apple::Handle::new();
    Some(handle.list_calendars())
}

#[cfg(target_os = "macos")]
#[tauri::command]
#[specta::specta]
pub fn list_apple_events(
    filter: hypr_calendar::apple::EventFilter,
) -> Option<Vec<hypr_calendar::apple::Event>> {
    let handle = hypr_calendar::apple::Handle::new();
    Some(handle.list_events(filter))
}

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
pub fn auth_url(app: AppHandle) -> String {
    let config = hypr_cloud::ClientConfig {
        base_url: "https://api.hypr.com".parse().unwrap(),
        auth_token: None,
    };

    let client = hypr_cloud::Client::new(config);
    client
        .get_authentication_url(hypr_cloud::AuthKind::GoogleOAuth)
        .to_string()
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

#[tauri::command]
#[specta::specta]
pub fn is_authenticated(app: AppHandle) -> bool {
    AuthStore::get(&app).is_ok()
}

pub enum AuthProvider {
    Google,
}

pub fn login(provider: AuthProvider) -> Result<(), String> {
    Ok(())
}

fn recordings_path(app: &AppHandle) -> PathBuf {
    let path = app.path().app_data_dir().unwrap().join("recordings");
    std::fs::create_dir_all(&path).unwrap_or_default();
    path
}

fn recording_path(app: &AppHandle, recording_id: &str) -> PathBuf {
    recordings_path(app).join(format!("{}.cap", recording_id))
}
