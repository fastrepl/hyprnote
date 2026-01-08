use crate::AudioPriorityPluginExt;
use hypr_audio_priority::{AudioDevice, AudioDirection, OutputCategory, PriorityState, StoredDevice};

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

#[tauri::command]
#[specta::specta]
pub(crate) async fn load_state<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<PriorityState, String> {
    app.audio_priority()
        .load_state()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn save_state<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    state: PriorityState,
) -> Result<(), String> {
    app.audio_priority()
        .save_state(state)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn get_input_priorities<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Vec<String>, String> {
    app.audio_priority()
        .get_input_priorities()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn get_speaker_priorities<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Vec<String>, String> {
    app.audio_priority()
        .get_speaker_priorities()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn get_headphone_priorities<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Vec<String>, String> {
    app.audio_priority()
        .get_headphone_priorities()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn save_input_priorities<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    priorities: Vec<String>,
) -> Result<(), String> {
    app.audio_priority()
        .save_input_priorities(priorities)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn save_speaker_priorities<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    priorities: Vec<String>,
) -> Result<(), String> {
    app.audio_priority()
        .save_speaker_priorities(priorities)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn save_headphone_priorities<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    priorities: Vec<String>,
) -> Result<(), String> {
    app.audio_priority()
        .save_headphone_priorities(priorities)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn move_device_to_top<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    device_id: String,
    direction: AudioDirection,
    category: Option<OutputCategory>,
) -> Result<(), String> {
    app.audio_priority()
        .move_device_to_top(&device_id, direction, category)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn get_device_category<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    device_id: String,
) -> Result<OutputCategory, String> {
    app.audio_priority()
        .get_device_category(&device_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn set_device_category<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    device_id: String,
    category: OutputCategory,
) -> Result<(), String> {
    app.audio_priority()
        .set_device_category(&device_id, category)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn get_current_mode<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<OutputCategory, String> {
    app.audio_priority()
        .get_current_mode()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn set_current_mode<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    mode: OutputCategory,
) -> Result<(), String> {
    app.audio_priority()
        .set_current_mode(mode)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn is_custom_mode<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<bool, String> {
    app.audio_priority()
        .is_custom_mode()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn set_custom_mode<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    enabled: bool,
) -> Result<(), String> {
    app.audio_priority()
        .set_custom_mode(enabled)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn get_known_devices<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Vec<StoredDevice>, String> {
    app.audio_priority()
        .get_known_devices()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn remember_device<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    uid: String,
    name: String,
    is_input: bool,
) -> Result<(), String> {
    app.audio_priority()
        .remember_device(&uid, &name, is_input)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn forget_device<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    uid: String,
) -> Result<(), String> {
    app.audio_priority()
        .forget_device(&uid)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn is_device_hidden<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    device_id: String,
    direction: AudioDirection,
) -> Result<bool, String> {
    app.audio_priority()
        .is_device_hidden(&device_id, direction)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn hide_device<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    device_id: String,
    direction: AudioDirection,
) -> Result<(), String> {
    app.audio_priority()
        .hide_device(&device_id, direction)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn unhide_device<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    device_id: String,
    direction: AudioDirection,
) -> Result<(), String> {
    app.audio_priority()
        .unhide_device(&device_id, direction)
        .await
        .map_err(|e| e.to_string())
}
