pub mod db;

use crate::{audio, events, App};
use anyhow::Result;
use std::path::PathBuf;
use tauri::{ipc::Channel, AppHandle, Manager};

use hypr_calendar::CalendarSource;

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

// #[tauri::command]
// #[specta::specta]
// pub fn get_fingerprint() -> String {
//     hypr_host::fingerprint()
// }

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
pub async fn list_events(calendar_id: String) -> Result<Vec<hypr_calendar::Event>, String> {
    let mut events: Vec<hypr_calendar::Event> = Vec::new();

    let filter = hypr_calendar::EventFilter {
        calendar_id,
        from: time::OffsetDateTime::now_utc()
            .checked_sub(time::Duration::days(30))
            .unwrap(),
        to: time::OffsetDateTime::now_utc()
            .checked_add(time::Duration::days(30))
            .unwrap(),
    };

    #[cfg(target_os = "macos")]
    {
        let apple_events = tokio::task::spawn_blocking(move || {
            let handle = hypr_calendar::apple::Handle::new();
            futures::executor::block_on(handle.list_events(filter)).unwrap_or(vec![])
        })
        .await
        .map_err(|e| e.to_string())?;

        events.extend(apple_events);
    }

    Ok(events)
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
