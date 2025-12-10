use crate::{event::HookEvent, runner::HookResult, HooksPluginExt};

#[tauri::command]
#[specta::specta]
pub(crate) async fn run_event_hooks<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    event: HookEvent,
) -> Result<Vec<HookResult>, String> {
    app.run_hooks(event).await.map_err(|e| e.to_string())
}
