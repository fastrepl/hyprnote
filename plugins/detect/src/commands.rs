use tauri::Manager;

#[tauri::command]
#[specta::specta]
pub(crate) async fn set_quit_handler<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<(), String> {
    hypr_intercept::setup_quit_handler(move || {
        for (_, window) in app.webview_windows() {
            let _ = window.close();
        }

        let _ = app.set_activation_policy(tauri::ActivationPolicy::Accessory);
        hypr_host::kill_processes_by_matcher(hypr_host::ProcessMatcher::Sidecar);

        false
    });

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
