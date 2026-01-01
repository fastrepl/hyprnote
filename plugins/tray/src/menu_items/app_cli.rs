use tauri::{
    AppHandle, Result,
    menu::{IconMenuItem, MenuItemKind, NativeIcon},
};
use tauri_plugin_cli2::Cli2PluginExt;
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons};

use super::MenuItemHandler;
use crate::TrayPluginExt;

pub struct AppCliInstall;

impl MenuItemHandler for AppCliInstall {
    const ID: &'static str = "hypr_app_cli_install";

    fn build(app: &AppHandle<tauri::Wry>) -> Result<MenuItemKind<tauri::Wry>> {
        let item = IconMenuItem::with_id_and_native_icon(
            app,
            Self::ID,
            "Install CLI",
            true,
            Some(NativeIcon::Add),
            None::<&str>,
        )?;
        Ok(MenuItemKind::Icon(item))
    }

    fn handle(app: &AppHandle<tauri::Wry>) {
        let app_clone = app.clone();
        let status = app.cli2().check_cli_status().ok();
        let binary_name = status
            .as_ref()
            .map(|s| s.binary_name.clone())
            .unwrap_or_else(|| "hyprnote".to_string());
        let is_in_path = status.as_ref().map(|s| s.is_in_path).unwrap_or(false);

        match app.cli2().install_cli_to_path() {
            Ok(_) => {
                let _ = app.tray().create_app_menu();
                let message = if is_in_path {
                    format!(
                        "CLI has been installed successfully.\n\nYou can now use '{}' command in your terminal.",
                        binary_name
                    )
                } else {
                    format!(
                        "CLI has been installed successfully.\n\nYou can now use '{}' command in your terminal.\n\nNote: ~/.local/bin may not be in your PATH. Add it with:\nexport PATH=\"$HOME/.local/bin:$PATH\"",
                        binary_name
                    )
                };
                app_clone
                    .dialog()
                    .message(message)
                    .title("CLI Installed")
                    .buttons(MessageDialogButtons::Ok)
                    .show(|_| {});
            }
            Err(e) => {
                app_clone
                    .dialog()
                    .message(format!("Failed to install CLI:\n\n{}", e))
                    .title("Installation Failed")
                    .buttons(MessageDialogButtons::Ok)
                    .show(|_| {});
            }
        }
    }
}

pub struct AppCliUninstall;

impl MenuItemHandler for AppCliUninstall {
    const ID: &'static str = "hypr_app_cli_uninstall";

    fn build(app: &AppHandle<tauri::Wry>) -> Result<MenuItemKind<tauri::Wry>> {
        let item = IconMenuItem::with_id_and_native_icon(
            app,
            Self::ID,
            "Uninstall CLI",
            true,
            Some(NativeIcon::Remove),
            None::<&str>,
        )?;
        Ok(MenuItemKind::Icon(item))
    }

    fn handle(app: &AppHandle<tauri::Wry>) {
        let app_clone = app.clone();
        match app.cli2().uninstall_cli_from_path() {
            Ok(_) => {
                let _ = app.tray().create_app_menu();
                app_clone
                    .dialog()
                    .message("CLI has been uninstalled successfully.")
                    .title("CLI Uninstalled")
                    .buttons(MessageDialogButtons::Ok)
                    .show(|_| {});
            }
            Err(e) => {
                app_clone
                    .dialog()
                    .message(format!("Failed to uninstall CLI:\n\n{}", e))
                    .title("Uninstallation Failed")
                    .buttons(MessageDialogButtons::Ok)
                    .show(|_| {});
            }
        }
    }
}

pub fn app_cli_menu(app: &AppHandle<tauri::Wry>) -> Result<MenuItemKind<tauri::Wry>> {
    let is_installed = app
        .cli2()
        .check_cli_status()
        .map(|status| status.is_installed)
        .unwrap_or(false);

    if is_installed {
        AppCliUninstall::build(app)
    } else {
        AppCliInstall::build(app)
    }
}
