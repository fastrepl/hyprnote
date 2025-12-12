use tauri::{AppHandle, Result, menu::MenuItem};

use super::MenuItemHandler;

pub struct TrayOpen;

impl MenuItemHandler for TrayOpen {
    const ID: &'static str = "hypr_tray_open";

    fn build(app: &AppHandle<tauri::Wry>) -> Result<MenuItem<tauri::Wry>> {
        MenuItem::with_id(app, Self::ID, "Open Hyprnote", true, None::<&str>)
    }

    fn handle(app: &AppHandle<tauri::Wry>) {
        use tauri_plugin_windows::AppWindow;
        let _ = AppWindow::Main.show(app);
    }
}
