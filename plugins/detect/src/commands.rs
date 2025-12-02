use tauri::Manager;

#[tauri::command]
#[specta::specta]
pub(crate) async fn set_quit_handler<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    really_quit: bool,
) -> Result<(), String> {
    hypr_intercept::setup_quit_handler(move || {
        hypr_host::kill_processes_by_matcher(hypr_host::ProcessMatcher::Sidecar);

        for (_, window) in app.webview_windows() {
            let _ = window.close();
        }

        #[cfg(target_os = "macos")]
        if !really_quit {
            let _ = app.set_activation_policy(tauri::ActivationPolicy::Accessory);
        }

        really_quit
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

#[tauri::command]
#[specta::specta]
pub(crate) async fn get_meeting_application<R: tauri::Runtime>(
    _app: tauri::AppHandle<R>,
) -> Result<Option<hypr_detect::InstalledApp>, String> {
    Ok(hypr_detect::get_meeting_app())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn list_default_ignored_bundle_ids<R: tauri::Runtime>(
    _app: tauri::AppHandle<R>,
) -> Result<Vec<String>, String> {
    Ok(crate::handler::default_ignored_bundle_ids())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn set_ignored_bundle_ids<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    bundle_ids: Vec<String>,
) -> Result<(), String> {
    let state = app.state::<crate::SharedState>();
    let mut state_guard = state.lock().await;
    state_guard.ignored_bundle_ids = bundle_ids;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn set_respect_do_not_disturb<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    enabled: bool,
) -> Result<(), String> {
    let state = app.state::<crate::SharedState>();
    let mut state_guard = state.lock().await;
    state_guard.respect_do_not_disturb = enabled;
    Ok(())
}
