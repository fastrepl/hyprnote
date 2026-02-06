use tauri::{
    AppHandle, Result,
    menu::{MenuItem, MenuItemKind},
};

use super::MenuItemHandler;

pub struct TrayOpen;

impl TrayOpen {
    fn get_channel(app_name: &str) -> &'static str {
        match app_name {
            "Hyprnote" => "stable",
            "Hyprnote Nightly" => "nightly",
            "Hyprnote Staging" => "staging",
            _ => "dev",
        }
    }
}

impl MenuItemHandler for TrayOpen {
    const ID: &'static str = "hypr_tray_open";

    fn build(app: &AppHandle<tauri::Wry>) -> Result<MenuItemKind<tauri::Wry>> {
        let app_version = app.package_info().version.to_string();
        let app_name = &app.package_info().name;
        let channel = Self::get_channel(app_name);

        let title = if channel == "stable" {
            format!("Open Hyprnote  {}", app_version)
        } else {
            format!("Open Hyprnote  {} ({})", app_version, channel)
        };

        let item = MenuItem::with_id(app, Self::ID, &title, true, None::<&str>)?;
        Ok(MenuItemKind::MenuItem(item))
    }

    fn handle(app: &AppHandle<tauri::Wry>) {
        use tauri_plugin_windows::AppWindow;
        let _ = AppWindow::Main.show(app);
    }
}
