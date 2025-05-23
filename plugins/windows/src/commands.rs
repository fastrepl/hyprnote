use crate::{HyprWindow, KnownPosition, WindowsPluginExt};

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
pub async fn window_resize_default(
    app: tauri::AppHandle<tauri::Wry>,
    window: HyprWindow,
) -> Result<(), String> {
    app.window_resize_default(window)
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
