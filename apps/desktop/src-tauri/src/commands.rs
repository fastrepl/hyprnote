use crate::{AppExt, StoreKey};

#[tauri::command]
#[specta::specta]
pub async fn sentry_dsn<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<String, String> {
    Ok(app.sentry_dsn())
}

#[tauri::command]
#[specta::specta]
pub async fn setup_db_for_cloud<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    app.setup_db_for_cloud().await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn is_onboarding_needed<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<bool, String> {
    let store = app.desktop_store()?;
    store
        .get(StoreKey::OnboardingNeeded)
        .map_err(|e| e.to_string())
        .map(|v| v.unwrap_or(true))
}

#[tauri::command]
#[specta::specta]
pub fn set_onboarding_needed<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    v: bool,
) -> Result<(), String> {
    let store = app.desktop_store()?;
    store
        .set(StoreKey::OnboardingNeeded, v)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn set_autostart<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    autostart: bool,
) -> Result<(), String> {
    let autostart_manager = {
        use tauri_plugin_autostart::ManagerExt;
        app.autolaunch()
    };

    if autostart {
        autostart_manager.enable().map_err(|e| e.to_string())
    } else {
        autostart_manager.disable().map_err(|e| e.to_string())
    }
}
