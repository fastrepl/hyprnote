use std::sync::atomic::{AtomicU8, Ordering};

use tauri::{
    AppHandle, Result,
    menu::{Menu, MenuItem, MenuItemKind, PredefinedMenuItem},
};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons};
use tauri_plugin_updater::UpdaterExt;
use tauri_plugin_updater2::Updater2PluginExt;

use super::{MenuItemHandler, TrayOpen, TrayQuit, TrayStart};

const STATE_CHECK_FOR_UPDATE: u8 = 0;
const STATE_DOWNLOADING: u8 = 1;
const STATE_RESTART_TO_APPLY: u8 = 2;

static UPDATE_STATE: AtomicU8 = AtomicU8::new(STATE_CHECK_FOR_UPDATE);

pub struct TrayCheckUpdate;

impl TrayCheckUpdate {
    pub fn set_state(app: &AppHandle<tauri::Wry>, state: UpdateMenuState) -> Result<()> {
        let (text, enabled, state_value) = match state {
            UpdateMenuState::CheckForUpdate => ("Check for Updates", true, STATE_CHECK_FOR_UPDATE),
            UpdateMenuState::Downloading => ("Downloading...", false, STATE_DOWNLOADING),
            UpdateMenuState::RestartToApply => {
                ("Restart to Apply Update", true, STATE_RESTART_TO_APPLY)
            }
        };

        UPDATE_STATE.store(state_value, Ordering::SeqCst);

        if let Some(menu) = app.menu() {
            if let Some(item) = menu.get(Self::ID) {
                if let MenuItemKind::MenuItem(menu_item) = item {
                    menu_item.set_text(text)?;
                    menu_item.set_enabled(enabled)?;
                }
            }
        }

        if let Some(tray) = app.tray_by_id("hypr-tray") {
            let check_update_item = MenuItem::with_id(app, Self::ID, text, enabled, None::<&str>)?;

            let menu = Menu::with_items(
                app,
                &[
                    &TrayOpen::build(app)?,
                    &TrayStart::build_with_disabled(app, false)?,
                    &PredefinedMenuItem::separator(app)?,
                    &MenuItemKind::MenuItem(check_update_item),
                    &PredefinedMenuItem::separator(app)?,
                    &TrayQuit::build(app)?,
                ],
            )?;

            tray.set_menu(Some(menu))?;
        }

        Ok(())
    }

    fn get_state() -> u8 {
        UPDATE_STATE.load(Ordering::SeqCst)
    }
}

#[derive(Debug, Clone, Copy)]
pub enum UpdateMenuState {
    CheckForUpdate,
    Downloading,
    RestartToApply,
}

impl MenuItemHandler for TrayCheckUpdate {
    const ID: &'static str = "hypr_tray_check_update";

    fn build(app: &AppHandle<tauri::Wry>) -> Result<MenuItemKind<tauri::Wry>> {
        let mut state = Self::get_state();

        if state == STATE_CHECK_FOR_UPDATE {
            if let Ok(Some(pending)) = app.get_pending_update_version() {
                if !pending.is_empty() {
                    UPDATE_STATE.store(STATE_RESTART_TO_APPLY, Ordering::SeqCst);
                    state = STATE_RESTART_TO_APPLY;
                }
            }
        }

        let (text, enabled) = match state {
            STATE_DOWNLOADING => ("Downloading...", false),
            STATE_RESTART_TO_APPLY => ("Restart to Apply Update", true),
            _ => ("Check for Updates", true),
        };
        let item = MenuItem::with_id(app, Self::ID, text, enabled, None::<&str>)?;
        Ok(MenuItemKind::MenuItem(item))
    }

    fn handle(app: &AppHandle<tauri::Wry>) {
        let current_state = Self::get_state();

        if current_state == STATE_RESTART_TO_APPLY {
            app.restart();
        }

        if current_state == STATE_DOWNLOADING {
            return;
        }

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
                                "Download".to_string(),
                                "Later".to_string(),
                            ))
                            .show(move |result| {
                                if result {
                                    let app_for_download = app_for_dialog.clone();
                                    tauri::async_runtime::spawn(async move {
                                        let _ = TrayCheckUpdate::set_state(
                                            &app_for_download,
                                            UpdateMenuState::Downloading,
                                        );

                                        match update.download_and_install(|_, _| {}, || {}).await {
                                            Ok(()) => {
                                                let _ = TrayCheckUpdate::set_state(
                                                    &app_for_download,
                                                    UpdateMenuState::RestartToApply,
                                                );
                                            }
                                            Err(e) => {
                                                let _ = TrayCheckUpdate::set_state(
                                                    &app_for_download,
                                                    UpdateMenuState::CheckForUpdate,
                                                );
                                                app_for_download
                                                    .dialog()
                                                    .message(format!(
                                                        "Failed to download update: {}",
                                                        e
                                                    ))
                                                    .title("Update Failed")
                                                    .show(|_| {});
                                            }
                                        }
                                    });
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
