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

#[tauri::command]
#[specta::specta]
pub(crate) async fn list_installed_applications<R: tauri::Runtime>(
    _app: tauri::AppHandle<R>,
) -> Result<Vec<hypr_detect::InstalledApp>, String> {
    Ok(hypr_detect::list_installed_apps())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn list_mic_using_applications<R: tauri::Runtime>(
    _app: tauri::AppHandle<R>,
) -> Result<Vec<hypr_detect::InstalledApp>, String> {
    Ok(hypr_detect::list_mic_using_apps())
}
