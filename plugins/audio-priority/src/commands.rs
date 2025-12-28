use crate::AudioPriorityPluginExt;
use hypr_audio_priority::AudioDevice;

#[tauri::command]
#[specta::specta]
pub(crate) async fn ping<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<String, String> {
    app.audio_priority().ping().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn list_devices<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Vec<AudioDevice>, String> {
    app.audio_priority()
        .list_devices()
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn list_input_devices<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Vec<AudioDevice>, String> {
    app.audio_priority()
        .list_input_devices()
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn list_output_devices<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Vec<AudioDevice>, String> {
    app.audio_priority()
        .list_output_devices()
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn get_default_input_device<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Option<AudioDevice>, String> {
    app.audio_priority()
        .get_default_input_device()
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn get_default_output_device<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Option<AudioDevice>, String> {
    app.audio_priority()
        .get_default_output_device()
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn set_default_input_device<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    device_id: String,
) -> Result<(), String> {
    app.audio_priority()
        .set_default_input_device(&device_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn set_default_output_device<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    device_id: String,
) -> Result<(), String> {
    app.audio_priority()
        .set_default_output_device(&device_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn is_headphone<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    device: AudioDevice,
) -> Result<bool, String> {
    Ok(app.audio_priority().is_headphone(&device))
}
