use std::path::PathBuf;

use crate::{AppWindow, WindowsPluginExt, events};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub enum SharePreferredEdge {
    TopLeft,
    TopRight,
    BottomLeft,
    BottomRight,
}

#[tauri::command]
#[specta::specta]
pub async fn window_show(
    app: tauri::AppHandle<tauri::Wry>,
    window: AppWindow,
) -> Result<(), String> {
    app.windows()
        .show_async(window)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn window_destroy(
    app: tauri::AppHandle<tauri::Wry>,
    window: AppWindow,
) -> Result<(), String> {
    app.windows().destroy(window).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn window_navigate(
    app: tauri::AppHandle<tauri::Wry>,
    window: AppWindow,
    path: String,
) -> Result<(), String> {
    app.windows()
        .navigate(window, path)
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
    app.windows()
        .emit_navigate(window, event)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn window_is_exists(
    app: tauri::AppHandle<tauri::Wry>,
    window: AppWindow,
) -> Result<bool, String> {
    let exists = app.windows().is_exists(window).map_err(|e| e.to_string())?;
    Ok(exists)
}

#[cfg(target_os = "macos")]
#[tauri::command]
#[specta::specta]
pub async fn share_files(
    app: tauri::AppHandle<tauri::Wry>,
    window: AppWindow,
    paths: Vec<PathBuf>,
    x: f64,
    y: f64,
    preferred_edge: SharePreferredEdge,
) -> Result<(), String> {
    use share_picker::{PreferredEdge, SharePicker};
    use tauri::Manager;

    let webview_window = window
        .get(&app)
        .ok_or_else(|| "Window not found".to_string())?;

    let scale_factor = webview_window.scale_factor().unwrap_or(1.0);
    let physical_x = x * scale_factor;
    let physical_y = y * scale_factor;

    let edge = match preferred_edge {
        SharePreferredEdge::TopLeft => PreferredEdge::TopLeft,
        SharePreferredEdge::TopRight => PreferredEdge::TopRight,
        SharePreferredEdge::BottomLeft => PreferredEdge::BottomLeft,
        SharePreferredEdge::BottomRight => PreferredEdge::BottomRight,
    };

    app.run_on_main_thread(move || {
        webview_window.share(
            paths,
            tauri::PhysicalPosition::new(physical_x, physical_y),
            edge,
        );
    })
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[cfg(not(target_os = "macos"))]
#[tauri::command]
#[specta::specta]
pub async fn share_files(
    _app: tauri::AppHandle<tauri::Wry>,
    _window: AppWindow,
    _paths: Vec<PathBuf>,
    _x: f64,
    _y: f64,
    _preferred_edge: SharePreferredEdge,
) -> Result<(), String> {
    Err("Share picker is only available on macOS".to_string())
}
