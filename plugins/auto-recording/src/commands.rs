use crate::error::Error;
use crate::ext::AutoRecordingPluginExt;

#[tauri::command]
#[specta::specta]
pub(crate) fn get_auto_recording_enabled<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<bool, String> {
    app.get_auto_recording_enabled().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) fn set_auto_recording_enabled<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    enabled: bool,
) -> Result<(), String> {
    app.set_auto_recording_enabled(enabled)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) fn get_auto_record_on_scheduled<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<bool, String> {
    app.get_auto_record_on_scheduled()
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) fn set_auto_record_on_scheduled<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    enabled: bool,
) -> Result<(), String> {
    app.set_auto_record_on_scheduled(enabled)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) fn get_auto_record_on_ad_hoc<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<bool, String> {
    app.get_auto_record_on_ad_hoc().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) fn set_auto_record_on_ad_hoc<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    enabled: bool,
) -> Result<(), String> {
    app.set_auto_record_on_ad_hoc(enabled)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) fn get_notify_before_meeting<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<bool, String> {
    app.get_notify_before_meeting().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) fn set_notify_before_meeting<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    enabled: bool,
) -> Result<(), String> {
    app.set_notify_before_meeting(enabled)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) fn get_require_window_focus<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<bool, String> {
    app.get_require_window_focus().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) fn set_require_window_focus<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    enabled: bool,
) -> Result<(), String> {
    app.set_require_window_focus(enabled)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) fn get_minutes_before_notification<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<u32, String> {
    app.get_minutes_before_notification()
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) fn set_minutes_before_notification<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    minutes: u32,
) -> Result<(), String> {
    app.set_minutes_before_notification(minutes)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) fn get_auto_stop_on_meeting_end<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<bool, String> {
    app.get_auto_stop_on_meeting_end()
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) fn set_auto_stop_on_meeting_end<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    enabled: bool,
) -> Result<(), String> {
    app.set_auto_stop_on_meeting_end(enabled)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) fn get_detection_confidence_threshold<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<f32, String> {
    app.get_detection_confidence_threshold()
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) fn set_detection_confidence_threshold<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    threshold: f32,
) -> Result<(), String> {
    app.set_detection_confidence_threshold(threshold)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn start_auto_recording_monitor<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<(), String> {
    app.start_auto_recording_monitor()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) fn stop_auto_recording_monitor<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<(), String> {
    app.stop_auto_recording_monitor().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn get_active_meetings<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Vec<hypr_meeting_detector::MeetingDetected>, String> {
    let state = app.state::<crate::SharedState>();
    let guard = state.lock().unwrap();

    if let Some(detector) = &guard.detector {
        Ok(detector.get_active_meetings().await)
    } else {
        Ok(Vec::new())
    }
}
