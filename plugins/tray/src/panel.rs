#![cfg(target_os = "macos")]

use objc2_app_kit::NSScreen;
use objc2_foundation::MainThreadMarker;
use tauri::{LogicalPosition, LogicalSize, Manager, WebviewWindow};
use tauri_nspanel::{
    CollectionBehavior, ManagerExt, Panel, PanelLevel, StyleMask, WebviewWindowExt, tauri_panel,
};

tauri_panel!(MenubarPanel {
    config: {
        can_become_key_window: true,
        can_become_main_window: false,
    }
});

pub fn setup_panel(window: &WebviewWindow) -> tauri::Result<()> {
    let panel = MenubarPanel::from_window(window)?;

    panel.set_level(PanelLevel::MainMenu.value() + 1);
    panel.set_style_mask(
        StyleMask::empty()
            .borderless()
            .nonactivating_panel()
            .value(),
    );
    panel.set_collection_behavior(
        CollectionBehavior::new()
            .can_join_all_spaces()
            .stationary()
            .full_screen_auxiliary()
            .value(),
    );
    panel.set_hides_on_deactivate(false);
    panel.set_corner_radius(13.0);

    Ok(())
}

pub fn toggle_panel(app: &tauri::AppHandle, tray_rect: tauri::Rect) {
    if let Ok(panel) = app.get_webview_panel("tray-panel") {
        if panel.is_visible() {
            panel.hide();
        } else {
            position_panel_at_tray_icon(app, tray_rect);
            panel.show();
        }
    }
}

pub fn position_panel_at_tray_icon(app: &tauri::AppHandle, tray_rect: tauri::Rect) {
    let Some(window) = app.get_webview_window("tray-panel") else {
        return;
    };

    let Ok(Some(monitor)) = window.current_monitor() else {
        return;
    };

    let scale_factor = monitor.scale_factor();
    let monitor_pos = monitor.position().to_logical::<f64>(scale_factor);
    let monitor_size = monitor.size().to_logical::<f64>(scale_factor);

    let icon_pos: LogicalPosition<f64> = tray_rect.position.to_logical(scale_factor);
    let icon_size: LogicalSize<f64> = tray_rect.size.to_logical(scale_factor);

    let Ok(window_size) = window.outer_size() else {
        return;
    };
    let window_size: LogicalSize<f64> = window_size.to_logical(scale_factor);

    let menubar_height = get_menubar_height();

    let x = icon_pos.x + icon_size.width / 2.0 - window_size.width / 2.0;
    let y = monitor_pos.y + monitor_size.height - menubar_height - window_size.height;

    let _ = window.set_position(tauri::Position::Logical(LogicalPosition::new(x, y)));
}

fn get_menubar_height() -> f64 {
    if let Some(mtm) = MainThreadMarker::new() {
        if let Some(screen) = NSScreen::mainScreen(mtm) {
            let frame = screen.frame();
            let visible_frame = screen.visibleFrame();
            return frame.size.height - visible_frame.size.height - visible_frame.origin.y;
        }
    }
    24.0
}
