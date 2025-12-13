use crate::{AppWindow, FakeWindowBounds, OverlayBound, WindowsPluginExt, events};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub enum VibrancyMaterial {
    Titlebar,
    Selection,
    Menu,
    Popover,
    Sidebar,
    HeaderView,
    Sheet,
    WindowBackground,
    HudWindow,
    FullScreenUI,
    Tooltip,
    ContentBackground,
    UnderWindowBackground,
    UnderPageBackground,
}

#[cfg(target_os = "macos")]
impl From<VibrancyMaterial> for window_vibrancy::NSVisualEffectMaterial {
    fn from(material: VibrancyMaterial) -> Self {
        match material {
            VibrancyMaterial::Titlebar => Self::Titlebar,
            VibrancyMaterial::Selection => Self::Selection,
            VibrancyMaterial::Menu => Self::Menu,
            VibrancyMaterial::Popover => Self::Popover,
            VibrancyMaterial::Sidebar => Self::Sidebar,
            VibrancyMaterial::HeaderView => Self::HeaderView,
            VibrancyMaterial::Sheet => Self::Sheet,
            VibrancyMaterial::WindowBackground => Self::WindowBackground,
            VibrancyMaterial::HudWindow => Self::HudWindow,
            VibrancyMaterial::FullScreenUI => Self::FullScreenUI,
            VibrancyMaterial::Tooltip => Self::Tooltip,
            VibrancyMaterial::ContentBackground => Self::ContentBackground,
            VibrancyMaterial::UnderWindowBackground => Self::UnderWindowBackground,
            VibrancyMaterial::UnderPageBackground => Self::UnderPageBackground,
        }
    }
}

#[tauri::command]
#[specta::specta]
pub async fn window_show(
    app: tauri::AppHandle<tauri::Wry>,
    window: AppWindow,
) -> Result<(), String> {
    app.window_show(window).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn window_destroy(
    app: tauri::AppHandle<tauri::Wry>,
    window: AppWindow,
) -> Result<(), String> {
    app.window_destroy(window).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn window_navigate(
    app: tauri::AppHandle<tauri::Wry>,
    window: AppWindow,
    path: String,
) -> Result<(), String> {
    app.window_navigate(window, path)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn window_emit_navigate(
    app: tauri::AppHandle<tauri::Wry>,
    window: AppWindow,
    event: events::Navigate,
) -> Result<(), String> {
    app.window_emit_navigate(window, event)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn window_is_exists(
    app: tauri::AppHandle<tauri::Wry>,
    window: AppWindow,
) -> Result<bool, String> {
    let exists = app.window_is_exists(window).map_err(|e| e.to_string())?;
    Ok(exists)
}

async fn update_bounds(
    window: &tauri::Window,
    state: &tauri::State<'_, FakeWindowBounds>,
    name: String,
    bounds: OverlayBound,
) -> Result<(), String> {
    let mut state = state.0.write().await;
    let map = state.entry(window.label().to_string()).or_default();
    map.insert(name, bounds);
    Ok(())
}

async fn remove_bounds(
    window: &tauri::Window,
    state: &tauri::State<'_, FakeWindowBounds>,
    name: String,
) -> Result<(), String> {
    let mut state = state.0.write().await;
    let Some(map) = state.get_mut(window.label()) else {
        return Ok(());
    };

    map.remove(&name);

    if map.is_empty() {
        state.remove(window.label());
    }

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn set_fake_window_bounds(
    window: tauri::Window,
    name: String,
    bounds: OverlayBound,
    state: tauri::State<'_, FakeWindowBounds>,
) -> Result<(), String> {
    update_bounds(&window, &state, name, bounds).await
}

#[tauri::command]
#[specta::specta]
pub async fn remove_fake_window(
    window: tauri::Window,
    name: String,
    state: tauri::State<'_, FakeWindowBounds>,
) -> Result<(), String> {
    remove_bounds(&window, &state, name).await
}

#[tauri::command]
#[specta::specta]
pub fn apply_vibrancy(
    app: tauri::AppHandle<tauri::Wry>,
    window: AppWindow,
    material: VibrancyMaterial,
    radius: Option<f64>,
) -> Result<(), String> {
    let Some(win) = window.get(&app) else {
        return Err("Window not found".to_string());
    };

    #[cfg(target_os = "macos")]
    {
        window_vibrancy::apply_vibrancy(&win, material.into(), None, radius)
            .map_err(|e| format!("Failed to apply vibrancy: {:?}", e))?;
    }

    #[cfg(target_os = "windows")]
    {
        let _ = material;
        let alpha = radius.map(|r| (r * 2.55) as u8).unwrap_or(125);
        window_vibrancy::apply_blur(&win, Some((18, 18, 18, alpha)))
            .map_err(|e| format!("Failed to apply blur: {:?}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        let _ = (material, radius);
    }

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn clear_vibrancy(app: tauri::AppHandle<tauri::Wry>, window: AppWindow) -> Result<(), String> {
    let Some(win) = window.get(&app) else {
        return Err("Window not found".to_string());
    };

    #[cfg(target_os = "macos")]
    {
        window_vibrancy::clear_vibrancy(&win)
            .map_err(|e| format!("Failed to clear vibrancy: {:?}", e))?;
    }

    #[cfg(target_os = "windows")]
    {
        window_vibrancy::clear_blur(&win).map_err(|e| format!("Failed to clear blur: {:?}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        let _ = win;
    }

    Ok(())
}
