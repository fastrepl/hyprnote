use crate::{events, icon, AppIcon, AppWindow, FakeWindowBounds, OverlayBound, WindowsPluginExt};

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
pub fn set_app_icon(icon_type: AppIcon) -> Result<(), String> {
    icon::set_app_icon(icon_type)
}

#[tauri::command]
#[specta::specta]
pub fn reset_app_icon() -> Result<(), String> {
    icon::reset_app_icon()
}

#[tauri::command]
#[specta::specta]
pub fn get_available_icons() -> Vec<AppIcon> {
    AppIcon::all()
}

#[tauri::command]
#[specta::specta]
pub fn get_build_channel(app: tauri::AppHandle) -> String {
    let identifier = &app.config().identifier;

    if identifier.contains("nightly") {
        "nightly".to_string()
    } else if identifier.contains("stable") {
        "stable".to_string()
    } else if identifier.contains("staging") {
        "staging".to_string()
    } else {
        "dev".to_string()
    }
}
