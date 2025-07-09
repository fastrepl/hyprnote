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

#[tauri::command]
#[specta::specta]
pub fn is_individualization_needed<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<bool, String> {
    let store = app.desktop_store()?;

    // Simple: just check if individualization was completed
    let individualization_needed: bool = store
        .get(StoreKey::IndividualizationNeeded)
        .map_err(|e| e.to_string())?
        .unwrap_or(true);

    Ok(individualization_needed)
}

#[tauri::command]
#[specta::specta]
pub fn set_individualization_needed<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    v: bool,
) -> Result<(), String> {
    let store = app.desktop_store()?;
    store
        .set(StoreKey::IndividualizationNeeded, v)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn get_app_open_count<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<u32, String> {
    let store = app.desktop_store()?;
    store
        .get(StoreKey::AppOpenCount)
        .map_err(|e| e.to_string())
        .map(|v| v.unwrap_or(0))
}

#[tauri::command]
#[specta::specta]
pub fn increment_app_open_count<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<u32, String> {
    let store = app.desktop_store()?;
    let current_count: u32 = store
        .get(StoreKey::AppOpenCount)
        .map_err(|e| e.to_string())?
        .unwrap_or(0);

    let new_count = current_count + 1;
    store
        .set(StoreKey::AppOpenCount, new_count)
        .map_err(|e| e.to_string())?;

    Ok(new_count)
}
