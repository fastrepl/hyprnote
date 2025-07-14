use crate::config::AutomationConfig;
use crate::MeetingAutomationPluginExt;

#[tauri::command]
#[specta::specta]
pub async fn start_meeting_automation<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<(), String> {
    app.start_meeting_automation().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn stop_meeting_automation<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<(), String> {
    app.stop_meeting_automation().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_automation_status<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<bool, String> {
    app.get_automation_status().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn configure_automation<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    config: AutomationConfig,
) -> Result<(), String> {
    app.configure_automation(config).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_automation_config<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<AutomationConfig, String> {
    app.get_automation_config().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn test_meeting_detection<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<(), String> {
    app.test_meeting_detection().map_err(|e| e.to_string())
}
