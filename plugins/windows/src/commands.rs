use crate::{FakeWindowBounds, HyprWindow, KnownPosition, OverlayBound, WindowsPluginExt};

#[tauri::command]
#[specta::specta]
pub async fn window_show(
    app: tauri::AppHandle<tauri::Wry>,
    window: HyprWindow,
) -> Result<(), String> {
    app.window_show(window).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn window_close(
    app: tauri::AppHandle<tauri::Wry>,
    window: HyprWindow,
) -> Result<(), String> {
    app.window_close(window).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn window_hide(
    app: tauri::AppHandle<tauri::Wry>,
    window: HyprWindow,
) -> Result<(), String> {
    app.window_hide(window).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn window_destroy(
    app: tauri::AppHandle<tauri::Wry>,
    window: HyprWindow,
) -> Result<(), String> {
    app.window_destroy(window).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn window_position(
    app: tauri::AppHandle<tauri::Wry>,
    window: HyprWindow,
    pos: KnownPosition,
) -> Result<(), String> {
    app.window_position(window, pos)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn window_is_visible(
    app: tauri::AppHandle<tauri::Wry>,
    window: HyprWindow,
) -> Result<bool, String> {
    let v = app.window_is_visible(window).map_err(|e| e.to_string())?;
    Ok(v)
}

#[tauri::command]
#[specta::specta]
pub async fn window_get_floating(
    app: tauri::AppHandle<tauri::Wry>,
    window: HyprWindow,
) -> Result<bool, String> {
    let v = app.window_get_floating(window).map_err(|e| e.to_string())?;
    Ok(v)
}

#[tauri::command]
#[specta::specta]
pub async fn window_set_floating(
    app: tauri::AppHandle<tauri::Wry>,
    window: HyprWindow,
    v: bool,
) -> Result<(), String> {
    app.window_set_floating(window, v)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn window_navigate(
    app: tauri::AppHandle<tauri::Wry>,
    window: HyprWindow,
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
    window: HyprWindow,
    path: String,
) -> Result<(), String> {
    app.window_emit_navigate(window, path)
        .map_err(|e| e.to_string())?;
    Ok(())
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
pub async fn window_set_overlay_bounds(
    window: tauri::Window,
    state: tauri::State<'_, FakeWindowBounds>,
    name: String,
    bounds: OverlayBound,
) -> Result<(), String> {
    update_bounds(&window, &state, name, bounds).await
}

#[tauri::command]
#[specta::specta]
pub async fn window_remove_overlay_bounds(
    window: tauri::Window,
    state: tauri::State<'_, FakeWindowBounds>,
    name: String,
) -> Result<(), String> {
    remove_bounds(&window, &state, name).await
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