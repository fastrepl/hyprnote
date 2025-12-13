use tauri::{AppHandle, Result, menu::MenuItem};

use super::MenuItemHandler;

pub struct AppNew;

impl MenuItemHandler for AppNew {
    const ID: &'static str = "hypr_app_new";

    fn build(app: &AppHandle<tauri::Wry>) -> Result<MenuItem<tauri::Wry>> {
        MenuItem::with_id(app, Self::ID, "New Note", true, Some("CmdOrCtrl+N"))
    }

    fn handle(app: &AppHandle<tauri::Wry>) {
        use tauri_plugin_windows::{AppWindow, Navigate, WindowsPluginExt};
        if app.window_show(AppWindow::Main).is_ok() {
            let _ = app.window_emit_navigate(
                AppWindow::Main,
                Navigate {
                    path: "/app/new".to_string(),
                    search: None,
                },
            );
        }
    }
}
