use tauri::{
    AppHandle, Result,
    menu::{MenuItem, MenuItemKind},
};

use super::MenuItemHandler;

pub struct TrayStart;

impl MenuItemHandler for TrayStart {
    const ID: &'static str = "hypr_tray_start";

    fn build(app: &AppHandle<tauri::Wry>) -> Result<MenuItemKind<tauri::Wry>> {
        let item = MenuItem::with_id(app, Self::ID, "Start a new recording", true, None::<&str>)?;
        Ok(MenuItemKind::MenuItem(item))
    }

    fn handle(app: &AppHandle<tauri::Wry>) {
        use tauri_plugin_windows::{AppWindow, Navigate, WindowsPluginExt};
        if app.window_show(AppWindow::Main).is_ok() {
            let _ = app.window_emit_navigate(
                AppWindow::Main,
                Navigate {
                    path: "/app/new".to_string(),
                    search: Some(
                        serde_json::json!({ "record": true })
                            .as_object()
                            .cloned()
                            .unwrap(),
                    ),
                },
            );
        }
    }
}

impl TrayStart {
    pub fn build_with_disabled(
        app: &AppHandle<tauri::Wry>,
        disabled: bool,
    ) -> Result<MenuItem<tauri::Wry>> {
        MenuItem::with_id(
            app,
            Self::ID,
            "Start a new recording",
            !disabled,
            None::<&str>,
        )
    }
}
