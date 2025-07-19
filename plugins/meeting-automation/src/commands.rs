use crate::config::AutomationConfig;
use crate::MeetingAutomationPluginExt;

#[tauri::command]
#[specta::specta]
pub fn start_meeting_automation(app: tauri::AppHandle) -> Result<(), String> {
    app.start_meeting_automation().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn stop_meeting_automation(app: tauri::AppHandle) -> Result<(), String> {
    app.stop_meeting_automation().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn get_automation_status(app: tauri::AppHandle) -> Result<bool, String> {
    app.get_automation_status().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn configure_automation(app: tauri::AppHandle, config: AutomationConfig) -> Result<(), String> {
    app.configure_automation(config).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn get_automation_config(app: tauri::AppHandle) -> Result<AutomationConfig, String> {
    app.get_automation_config().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn test_meeting_detection(app: tauri::AppHandle) -> Result<(), String> {
    app.test_meeting_detection().map_err(|e| e.to_string())
}
