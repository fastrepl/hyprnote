use tauri::{AppHandle, Result, menu::MenuItem};

use super::MenuItemHandler;

pub struct TrayQuit;

impl MenuItemHandler for TrayQuit {
    const ID: &'static str = "hypr_tray_quit";

    fn build(app: &AppHandle<tauri::Wry>) -> Result<MenuItem<tauri::Wry>> {
        MenuItem::with_id(app, Self::ID, "Quit Completely", true, Some("cmd+q"))
    }

    fn handle(app: &AppHandle<tauri::Wry>) {
        hypr_host::kill_processes_by_matcher(hypr_host::ProcessMatcher::Sidecar);
        app.exit(0);
    }
}
