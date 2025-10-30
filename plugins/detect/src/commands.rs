#[tauri::command]
#[specta::specta]
pub(crate) async fn set_quit_handler<R: tauri::Runtime>(
    _app: tauri::AppHandle<R>,
) -> Result<(), String> {
    hypr_intercept::setup_quit_handler(|| true);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn reset_quit_handler<R: tauri::Runtime>(
    _app: tauri::AppHandle<R>,
) -> Result<(), String> {
    hypr_intercept::reset_quit_handler();
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
