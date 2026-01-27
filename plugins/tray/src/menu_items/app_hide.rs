use tauri::{
    AppHandle, Manager, Result,
    menu::{MenuItem, MenuItemKind},
};

use super::MenuItemHandler;

pub struct AppHide;

impl MenuItemHandler for AppHide {
    const ID: &'static str = "hypr_app_hide";

    fn build(app: &AppHandle<tauri::Wry>) -> Result<MenuItemKind<tauri::Wry>> {
        let item = MenuItem::with_id(app, Self::ID, "Hide", true, Some("cmd+q"))?;
        Ok(MenuItemKind::MenuItem(item))
    }

    fn handle(app: &AppHandle<tauri::Wry>) {
        for (_, window) in app.webview_windows() {
            let _ = window.close();
        }

        let _ = app.set_activation_policy(tauri::ActivationPolicy::Accessory);
    }
}
