use tauri::Manager;

use crate::DetectPluginExt;

const QUIT_HANDLER_ID: &str = "detect";

#[tauri::command]
#[specta::specta]
pub(crate) async fn set_quit_handler<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    really_quit: bool,
) -> Result<(), String> {
    hypr_intercept::register_quit_handler(QUIT_HANDLER_ID, move || {
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
    hypr_intercept::unregister_quit_handler(QUIT_HANDLER_ID);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn list_installed_applications<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Vec<hypr_detect::InstalledApp>, String> {
    Ok(app.detect().list_installed_applications())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn list_mic_using_applications<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Vec<hypr_detect::InstalledApp>, String> {
    Ok(app.detect().list_mic_using_applications())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn list_default_ignored_bundle_ids<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Vec<String>, String> {
    Ok(app.detect().list_default_ignored_bundle_ids())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn set_ignored_bundle_ids<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    bundle_ids: Vec<String>,
) -> Result<(), String> {
    app.detect().set_ignored_bundle_ids(bundle_ids).await;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub(crate) async fn set_respect_do_not_disturb<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    enabled: bool,
) -> Result<(), String> {
    app.detect().set_respect_do_not_disturb(enabled).await;
    Ok(())
}
