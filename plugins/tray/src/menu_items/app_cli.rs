use tauri::{AppHandle, Result, menu::MenuItem};
use tauri_plugin_cli2::CliPluginExt;

use super::MenuItemHandler;
use crate::TrayPluginExt;

pub struct AppCliInstall;

impl MenuItemHandler for AppCliInstall {
    const ID: &'static str = "hypr_app_cli_install";

    fn build(app: &AppHandle<tauri::Wry>) -> Result<MenuItem<tauri::Wry>> {
        MenuItem::with_id(app, Self::ID, "Install CLI", true, None::<&str>)
    }

    fn handle(app: &AppHandle<tauri::Wry>) {
        if app.plugin_cli().install_cli_to_path().is_ok() {
            let _ = app.create_app_menu();
        }
    }
}

pub struct AppCliUninstall;

impl MenuItemHandler for AppCliUninstall {
    const ID: &'static str = "hypr_app_cli_uninstall";

    fn build(app: &AppHandle<tauri::Wry>) -> Result<MenuItem<tauri::Wry>> {
        MenuItem::with_id(app, Self::ID, "Uninstall CLI", true, None::<&str>)
    }

    fn handle(app: &AppHandle<tauri::Wry>) {
        if app.plugin_cli().uninstall_cli_from_path().is_ok() {
            let _ = app.create_app_menu();
        }
    }
}

pub fn app_cli_menu(app: &AppHandle<tauri::Wry>) -> Result<MenuItem<tauri::Wry>> {
    let is_installed = app
        .plugin_cli()
        .check_cli_status()
        .map(|status| status.is_installed)
        .unwrap_or(false);

    if is_installed {
        AppCliUninstall::build(app)
    } else {
        AppCliInstall::build(app)
    }
}
