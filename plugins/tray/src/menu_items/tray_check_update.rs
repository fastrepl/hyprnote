use tauri::{
    AppHandle, Result,
    menu::{MenuItem, MenuItemKind},
};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons};
use tauri_plugin_updater::UpdaterExt;

use super::MenuItemHandler;

pub struct TrayCheckUpdate;

impl MenuItemHandler for TrayCheckUpdate {
    const ID: &'static str = "hypr_tray_check_update";

    fn build(app: &AppHandle<tauri::Wry>) -> Result<MenuItemKind<tauri::Wry>> {
        let item = MenuItem::with_id(app, Self::ID, "Check for Updates", true, None::<&str>)?;
        Ok(MenuItemKind::MenuItem(item))
    }

    fn handle(app: &AppHandle<tauri::Wry>) {
        let app_clone = app.clone();
        tauri::async_runtime::spawn(async move {
            match app_clone.updater() {
                Ok(updater) => match updater.check().await {
                    Ok(Some(update)) => {
                        let version = update.version.clone();
                        let body = update
                            .body
                            .clone()
                            .unwrap_or_else(|| "No release notes.".to_string());

                        let app_for_dialog = app_clone.clone();
                        app_clone
                            .dialog()
                            .message(format!("Update v{} is available!\n\n{}", version, body))
                            .title("Update Available")
                            .buttons(MessageDialogButtons::OkCancelCustom(
                                "View Update".to_string(),
                                "Later".to_string(),
                            ))
                            .show(move |result| {
                                if result {
                                    use tauri_plugin_windows::AppWindow;
                                    let _ = AppWindow::Main.show(&app_for_dialog);
                                }
                            });
                    }
                    Ok(None) => {
                        app_clone
                            .dialog()
                            .message("There are currently no updates available.")
                            .title("Check for Updates")
                            .show(|_| {});
                    }
                    Err(e) => {
                        app_clone
                            .dialog()
                            .message(format!("Failed to check for updates: {}", e))
                            .title("Update Check Failed")
                            .show(|_| {});
                    }
                },
                Err(e) => {
                    app_clone
                        .dialog()
                        .message(format!("Failed to initialize updater: {}", e))
                        .title("Updater Error")
                        .show(|_| {});
                }
            }
        });
    }
}
