use crate::{audio, config, permissions};
use cap_media::feeds::AudioInputFeed;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use tauri_plugin_store::StoreExt;

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

#[tauri::command]
#[specta::specta]
pub fn set_config(app: AppHandle, config: config::Config) {
    let store = app.store("store.json").unwrap();
    store.set("config", serde_json::json!(config));
}

#[tauri::command]
#[specta::specta]
pub fn get_config(app: AppHandle) -> config::Config {
    let store = app.store("store.json").unwrap();
    let value = store.get("config").unwrap();
    serde_json::from_value(value).unwrap()
}

fn recordings_path(app: &AppHandle) -> PathBuf {
    let path = app.path().app_data_dir().unwrap().join("recordings");
    std::fs::create_dir_all(&path).unwrap_or_default();
    path
}

fn recording_path(app: &AppHandle, recording_id: &str) -> PathBuf {
    recordings_path(app).join(format!("{}.cap", recording_id))
}
