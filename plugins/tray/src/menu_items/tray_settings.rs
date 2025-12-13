use tauri::{
    AppHandle, Result,
    menu::{MenuItem, MenuItemKind},
};

use super::MenuItemHandler;

pub struct TraySettings;

impl MenuItemHandler for TraySettings {
    const ID: &'static str = "hypr_tray_settings";

    fn build(app: &AppHandle<tauri::Wry>) -> Result<MenuItemKind<tauri::Wry>> {
        let item = MenuItem::with_id(app, Self::ID, "Settings", true, Some("cmd+,"))?;
        Ok(MenuItemKind::MenuItem(item))
    }

    fn handle(app: &AppHandle<tauri::Wry>) {
        use tauri_plugin_windows::{AppWindow, Navigate, WindowsPluginExt};
        if app.window_show(AppWindow::Main).is_ok() {
            let _ = app.window_emit_navigate(
                AppWindow::Main,
                Navigate {
                    path: "/app/settings".to_string(),
                    search: Some(
                        serde_json::json!({ "tab": "general" })
                            .as_object()
                            .cloned()
                            .unwrap(),
                    ),
                },
            );
        }
    }
}
