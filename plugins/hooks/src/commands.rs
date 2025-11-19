use crate::{event::HookEvent, HooksPluginExt};

#[tauri::command]
#[specta::specta]
pub(crate) async fn run_event_hooks<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    event: HookEvent,
) -> Result<(), String> {
    app.run_hooks(event).map_err(|e| e.to_string())
}
