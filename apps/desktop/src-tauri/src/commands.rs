use crate::AppExt;

#[cfg(target_os = "macos")]
pub fn setup_theme_observer<R: tauri::Runtime + 'static>(app_handle: tauri::AppHandle<R>) {
    use std::time::Duration;
    use tauri::Emitter;

    std::thread::spawn(move || {
        let mut last_theme = get_system_theme();

        loop {
            std::thread::sleep(Duration::from_millis(500));

            let current_theme = get_system_theme();
            if current_theme != last_theme {
                last_theme = current_theme.clone();
                let _ = app_handle.emit("system-theme-changed", current_theme);
            }
        }
    });
}

#[tauri::command]
#[specta::specta]
pub fn get_system_theme() -> String {
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;

        let output = Command::new("defaults")
            .args(["read", "-g", "AppleInterfaceStyle"])
            .output();

        match output {
            Ok(output) => {
                let stdout = String::from_utf8_lossy(&output.stdout);
                if stdout.trim().eq_ignore_ascii_case("dark") {
                    "dark".to_string()
                } else {
                    "light".to_string()
                }
            }
            Err(_) => "light".to_string(),
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        "light".to_string()
    }
}

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
        false
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
pub async fn resize_window_for_sidebar<R: tauri::Runtime>(
    window: tauri::Window<R>,
) -> Result<(), String> {
    let outer_size = window.outer_size().map_err(|e| e.to_string())?;

    if outer_size.width < 840 {
        let new_size = tauri::PhysicalSize {
            width: outer_size.width + 280,
            height: outer_size.height,
        };
        window
            .set_size(tauri::Size::Physical(new_size))
            .map_err(|e| e.to_string())?;
    }

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
pub async fn get_pinned_tabs<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Option<String>, String> {
    app.get_pinned_tabs()
}

#[tauri::command]
#[specta::specta]
pub async fn set_pinned_tabs<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    v: String,
) -> Result<(), String> {
    app.set_pinned_tabs(v)
}

#[tauri::command]
#[specta::specta]
pub async fn get_recently_opened_sessions<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Option<String>, String> {
    app.get_recently_opened_sessions()
}

#[tauri::command]
#[specta::specta]
pub async fn set_recently_opened_sessions<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    v: String,
) -> Result<(), String> {
    app.set_recently_opened_sessions(v)
}
