use tauri::{Emitter, Manager};

use crate::ext::AppExt;

#[derive(serde::Serialize, Clone)]
pub struct UpdatedPayload {
    pub previous: String,
    pub current: String,
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
