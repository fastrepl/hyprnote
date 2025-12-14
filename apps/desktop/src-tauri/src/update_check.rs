use tauri::{Emitter, Manager};
use tauri_plugin_updater::UpdaterExt;

use crate::ext::AppExt;

#[derive(serde::Serialize, Clone)]
pub struct UpdatedPayload {
    pub previous: String,
    pub current: String,
}

pub fn start_background_update_check(app_handle: &tauri::AppHandle) {
    let app = app_handle.clone();
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(std::time::Duration::from_secs(5)).await;

        let updater = match app.updater() {
            Ok(u) => u,
            Err(e) => {
                tracing::debug!("updater_not_available: {}", e);
                return;
            }
        };

        tracing::info!("checking_for_updates_in_background");

        match updater.check().await {
            Ok(Some(update)) => {
                tracing::info!("update_available: v{}", update.version);

                use tauri_plugin_tray::{TrayCheckUpdate, UpdateMenuState};
                let _ = TrayCheckUpdate::set_state(&app, UpdateMenuState::Downloading);

                match update.download_and_install(|_, _| {}, || {}).await {
                    Ok(()) => {
                        tracing::info!("update_downloaded: v{}", update.version);
                        let _ = TrayCheckUpdate::set_state(&app, UpdateMenuState::RestartToApply);
                    }
                    Err(e) => {
                        tracing::error!("update_download_failed: {}", e);
                        let _ = TrayCheckUpdate::set_state(&app, UpdateMenuState::CheckForUpdate);
                    }
                }
            }
            Ok(None) => {
                tracing::debug!("no_updates_available");
            }
            Err(e) => {
                tracing::debug!("update_check_failed: {}", e);
            }
        }
    });
}

pub fn maybe_emit_updated<R: tauri::Runtime>(app_handle: &tauri::AppHandle<R>) {
    let current_version = match app_handle.config().version.as_ref() {
        Some(v) => v.clone(),
        None => {
            tracing::warn!("no_version_in_config");
            return;
        }
    };

    match app_handle.get_last_seen_version() {
        Ok(Some(last_version)) if !last_version.is_empty() => {
            if last_version != current_version {
                tracing::info!("version_updated: {} -> {}", last_version, current_version);

                let payload = UpdatedPayload {
                    previous: last_version,
                    current: current_version.clone(),
                };

                if let Err(e) = app_handle.emit("Updated", payload) {
                    tracing::error!("failed_to_emit_updated_event: {}", e);
                }

                if let Err(e) = app_handle.set_last_seen_version(current_version) {
                    tracing::error!("failed_to_update_version: {}", e);
                }
            }
        }
        Ok(Some(_)) | Ok(None) => {
            let is_existing_install = app_handle.get_onboarding_needed().is_ok();

            if is_existing_install {
                tracing::info!(
                    "existing_user_migration: showing changelog for {}",
                    current_version
                );
                let payload = UpdatedPayload {
                    previous: "pre-changelog".to_string(),
                    current: current_version.clone(),
                };
                if let Err(e) = app_handle.emit("Updated", payload) {
                    tracing::error!("failed_to_emit_updated_event: {}", e);
                }
            } else {
                tracing::info!("first_install: storing version {}", current_version);
            }

            if let Err(e) = app_handle.set_last_seen_version(current_version) {
                tracing::error!("failed_to_store_initial_version: {}", e);
            }
        }
        Err(e) => {
            tracing::error!("failed_to_get_last_seen_version: {}", e);
        }
    }
}
