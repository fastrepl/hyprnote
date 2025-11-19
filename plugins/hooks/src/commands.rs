use crate::{AfterListeningStoppedArgs, HookEvent, HooksPluginExt};

#[tauri::command]
#[specta::specta]
pub(crate) async fn ping<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    value: Option<String>,
) -> Result<Option<String>, String> {
    app.ping(value).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn after_listening_stopped<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    args: AfterListeningStoppedArgs,
) -> Result<(), String> {
    let event = HookEvent::AfterListeningStopped(args);
    app.run_hooks(event).map_err(|e| e.to_string())
}
