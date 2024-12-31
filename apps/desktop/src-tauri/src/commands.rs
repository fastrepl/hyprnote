use crate::{audio, auth::AuthStore, config::ConfigStore, events, permissions, App};
use anyhow::Result;
use std::{path::PathBuf, sync::Arc};
use tauri::{ipc::Channel, AppHandle, Manager, State};
use tokio::sync::RwLock;

use hypr_calendar::CalendarSource;

type MutableState<'a, T> = State<'a, Arc<RwLock<T>>>;

#[tauri::command]
#[specta::specta]
pub fn create_session(_app: AppHandle) {}

#[tauri::command]
#[specta::specta]
pub fn start_session(_app: AppHandle, on_event: Channel<events::Transcript>) {
    let _ = tokio::spawn(async move {
        let _ = on_event.send(events::Transcript {
            text: "Hello, world!".to_string(),
        });
    });
}

#[tauri::command]
#[specta::specta]
pub async fn start_playback(_app: AppHandle, _audio_id: String) {}

#[tauri::command]
#[specta::specta]
pub async fn stop_playback(_app: AppHandle, _audio_id: String) {}

#[tauri::command]
#[specta::specta]
pub async fn list_calendars() -> Result<Vec<hypr_calendar::Calendar>, String> {
    let mut calendars: Vec<hypr_calendar::Calendar> = Vec::new();

    #[cfg(target_os = "macos")]
    {
        let apple_calendars = tokio::task::spawn_blocking(|| {
            let handle = hypr_calendar::apple::Handle::new();
            futures::executor::block_on(handle.list_calendars()).unwrap_or(vec![])
        })
        .await
        .map_err(|e| e.to_string())?;

        calendars.extend(apple_calendars);
    }

    Ok(calendars)
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
