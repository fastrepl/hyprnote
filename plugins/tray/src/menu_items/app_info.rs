use tauri::{
    AppHandle, Result,
    menu::{IconMenuItem, MenuItemKind, NativeIcon},
};
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons};
use tauri_plugin_misc::MiscPluginExt;

use super::MenuItemHandler;

pub struct AppInfo;

impl MenuItemHandler for AppInfo {
    const ID: &'static str = "hypr_app_info";

    fn build(app: &AppHandle<tauri::Wry>) -> Result<MenuItemKind<tauri::Wry>> {
        let item = IconMenuItem::with_id_and_native_icon(
            app,
            Self::ID,
            "About Hyprnote",
            true,
            Some(NativeIcon::Info),
            None::<&str>,
        )?;
        Ok(MenuItemKind::Icon(item))
    }

    fn handle(app: &AppHandle<tauri::Wry>) {
        let app_name = app.package_info().name.clone();
        let app_version = app.package_info().version.to_string();
        let app_commit = app.get_git_hash();

        let message = format!(
            "- App Name: {}\n- App Version: {}\n- SHA:\n  {}",
            app_name, app_version, app_commit
        );

        let app_clone = app.clone();

        app.dialog()
            .message(&message)
            .title("About Hyprnote")
            .buttons(MessageDialogButtons::OkCancelCustom(
                "Copy".to_string(),
                "Cancel".to_string(),
            ))
            .show(move |result| {
                if result {
                    let _ = app_clone.clipboard().write_text(&message);
                }
            });
    }
}
