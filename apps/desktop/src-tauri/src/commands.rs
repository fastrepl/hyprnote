use crate::AppExt;

#[tauri::command]
#[specta::specta]
pub async fn get_onboarding_needed<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<bool, String> {
    app.get_onboarding_needed().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn set_onboarding_needed<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    v: bool,
) -> Result<(), String> {
    app.set_onboarding_needed(v).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_dismissed_toasts<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Vec<String>, String> {
    app.get_dismissed_toasts()
}

#[tauri::command]
#[specta::specta]
pub async fn set_dismissed_toasts<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    v: Vec<String>,
) -> Result<(), String> {
    app.set_dismissed_toasts(v)
}

#[tauri::command]
#[specta::specta]
pub async fn get_onboarding_local<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<bool, String> {
    app.get_onboarding_local().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn set_onboarding_local<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    v: bool,
) -> Result<(), String> {
    app.set_onboarding_local(v).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_env<R: tauri::Runtime>(_app: tauri::AppHandle<R>, key: String) -> String {
    std::env::var(&key).unwrap_or_default()
}

#[tauri::command]
#[specta::specta]
pub fn show_devtool() -> bool {
    if cfg!(debug_assertions) {
        return true;
    }

    #[cfg(feature = "devtools")]
    {
        return true;
    }

    #[cfg(not(feature = "devtools"))]
    {
        return false;
    }
}

#[tauri::command]
#[specta::specta]
pub async fn resize_window_for_chat<R: tauri::Runtime>(
    window: tauri::Window<R>,
) -> Result<(), String> {
    let outer_size = window.outer_size().map_err(|e| e.to_string())?;

    let new_size = tauri::PhysicalSize {
        width: outer_size.width + 400,
        height: outer_size.height,
    };
    window
        .set_size(tauri::Size::Physical(new_size))
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn get_tinybase_values<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Option<String>, String> {
    app.get_tinybase_values()
}

#[tauri::command]
#[specta::specta]
pub async fn set_tinybase_values<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    v: String,
) -> Result<(), String> {
    app.set_tinybase_values(v)
}

#[tauri::command]
#[specta::specta]
pub async fn get_migration_dismissed<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<bool, String> {
    app.get_migration_dismissed()
}

#[tauri::command]
#[specta::specta]
pub async fn set_migration_dismissed<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    v: bool,
) -> Result<(), String> {
    app.set_migration_dismissed(v)
}
