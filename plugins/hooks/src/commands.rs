use crate::{
    event::{AfterListeningStoppedArgs, BeforeListeningStartedArgs, HookEvent},
    HooksPluginExt,
};

#[tauri::command]
#[specta::specta]
pub(crate) async fn before_listening_started<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    args: BeforeListeningStartedArgs,
) -> Result<(), String> {
    let event = HookEvent::BeforeListeningStarted(args);
    app.run_hooks(event).map_err(|e| e.to_string())
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
