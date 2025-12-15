use tauri::{
    AppHandle, Result,
    menu::{MenuItem, MenuItemKind, Submenu},
};

use super::MenuItemHandler;

pub struct TraySettings;

impl MenuItemHandler for TraySettings {
    const ID: &'static str = "hypr_tray_settings";

    fn build(app: &AppHandle<tauri::Wry>) -> Result<MenuItemKind<tauri::Wry>> {
        let submenu = {
            let submenu = Submenu::with_id(app, Self::ID, "Settings", true)?;

            let open_general = MenuItem::with_id(
                app,
                TraySettingsGeneral::ID,
                "Open General",
                true,
                None::<&str>,
            )?;

            let open_ai =
                MenuItem::with_id(app, TraySettingsAI::ID, "Open AI", true, None::<&str>)?;

            submenu.append_items(&[&open_general, &open_ai])?;
            submenu
        };

        Ok(MenuItemKind::Submenu(submenu))
    }

    fn handle(_app: &AppHandle<tauri::Wry>) {}
}

pub struct TraySettingsGeneral;

impl MenuItemHandler for TraySettingsGeneral {
    const ID: &'static str = "hypr_tray_settings_general";

    fn build(app: &AppHandle<tauri::Wry>) -> Result<MenuItemKind<tauri::Wry>> {
        let item = MenuItem::with_id(app, Self::ID, "Open General", true, None::<&str>)?;
        Ok(MenuItemKind::MenuItem(item))
    }

    fn handle(app: &AppHandle<tauri::Wry>) {
        use tauri_plugin_windows::{AppWindow, WindowsPluginExt};
        if app.windows().show(AppWindow::Main).is_ok() {
            todo!()
        }
    }
}

pub struct TraySettingsAI;

impl MenuItemHandler for TraySettingsAI {
    const ID: &'static str = "hypr_tray_settings_ai";

    fn build(app: &AppHandle<tauri::Wry>) -> Result<MenuItemKind<tauri::Wry>> {
        let item = MenuItem::with_id(app, Self::ID, "Open AI", true, None::<&str>)?;
        Ok(MenuItemKind::MenuItem(item))
    }

    fn handle(app: &AppHandle<tauri::Wry>) {
        use tauri_plugin_windows::{AppWindow, WindowsPluginExt};
        if app.windows().show(AppWindow::Main).is_ok() {
            todo!()
        }
    }
}
