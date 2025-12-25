use crate::{AppWindow, FakeWindowBounds, OverlayBound, WindowsPluginExt, events};
use hypr_move::{MoveResult, PermissionStatus, WindowInfo, WindowPosition};
use tauri::Manager;

#[tauri::command]
#[specta::specta]
pub async fn window_show(
    app: tauri::AppHandle<tauri::Wry>,
    window: AppWindow,
) -> Result<(), String> {
    app.windows().show(window).map_err(|e| e.to_string())?;
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
pub async fn tile_with_external_window(
    app: tauri::AppHandle<tauri::Wry>,
) -> Result<MoveResult, String> {
    if !hypr_move::is_available() {
        return Err("Window tiling is not available on this platform".to_string());
    }

    let result =
        hypr_move::move_focused_window(WindowPosition::RightHalf).map_err(|e| e.to_string())?;

    if let Some(main_window) = app.get_webview_window("main") {
        let monitor = main_window
            .primary_monitor()
            .map_err(|e| e.to_string())?
            .ok_or("No primary monitor found")?;

        // Use work_area() instead of size() to exclude menu bar and dock
        let work_area = monitor.work_area();
        let scale = monitor.scale_factor();

        let width = work_area.size.width as f64 / scale / 2.0;
        let height = work_area.size.height as f64 / scale;

        // Use work_area position to handle monitors that don't start at (0,0)
        let x = work_area.position.x as f64 / scale;
        let y = work_area.position.y as f64 / scale;

        main_window
            .set_position(tauri::LogicalPosition::new(x, y))
            .map_err(|e| e.to_string())?;
        main_window
            .set_size(tauri::LogicalSize::new(width, height))
            .map_err(|e| e.to_string())?;
    }

    Ok(result)
}

#[tauri::command]
#[specta::specta]
pub async fn move_external_window(position: WindowPosition) -> Result<MoveResult, String> {
    if !hypr_move::is_available() {
        return Err("Window movement is not available on this platform".to_string());
    }

    hypr_move::move_focused_window(position).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_focused_window_info() -> Result<Option<WindowInfo>, String> {
    if !hypr_move::is_available() {
        return Ok(None);
    }

    hypr_move::get_focused_window_info().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn check_window_move_permissions() -> Result<PermissionStatus, String> {
    Ok(hypr_move::check_permissions())
}

#[tauri::command]
#[specta::specta]
pub async fn request_window_move_permissions() -> Result<(), String> {
    hypr_move::request_permissions();
    Ok(())
}
