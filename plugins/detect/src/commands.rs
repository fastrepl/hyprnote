use crate::DetectPluginExt;

#[tauri::command]
#[specta::specta]
pub async fn start_detection<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    app.start_detection().await;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn stop_detection<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    app.stop_detection().await;
    Ok(())
}
