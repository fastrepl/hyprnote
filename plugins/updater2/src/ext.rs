use tauri::{Emitter, Manager};
use tauri_plugin_store2::StorePluginExt;

#[derive(Debug, Clone, serde::Serialize, specta::Type, tauri_specta::Event)]
pub struct UpdatedEvent {
    pub previous: String,
    pub current: String,
}

pub trait Updater2PluginExt<R: tauri::Runtime> {
    fn ping(&self) -> Result<(), crate::Error>;
    fn get_last_seen_version(&self) -> Result<Option<String>, crate::Error>;
    fn set_last_seen_version(&self, version: String) -> Result<(), crate::Error>;
    fn maybe_emit_updated(&self, is_existing_install: bool);
}

impl<R: tauri::Runtime, T: Manager<R> + Emitter<R>> crate::Updater2PluginExt<R> for T {
    fn ping(&self) -> Result<(), crate::Error> {
        Ok(())
    }

    fn get_last_seen_version(&self) -> Result<Option<String>, crate::Error> {
        let store = self.scoped_store(crate::PLUGIN_NAME)?;
        let v = store.get(crate::StoreKey::LastSeenVersion)?;
        Ok(v)
    }

    fn set_last_seen_version(&self, version: String) -> Result<(), crate::Error> {
        let store = self.scoped_store(crate::PLUGIN_NAME)?;
        store.set(crate::StoreKey::LastSeenVersion, version)?;
        Ok(())
    }

    fn maybe_emit_updated(&self, is_existing_install: bool) {
        let current_version = match self.config().version.as_ref() {
            Some(v) => v.clone(),
            None => {
                tracing::warn!("no_version_in_config");
                return;
            }
        };

        match self.get_last_seen_version() {
            Ok(Some(last_version)) if !last_version.is_empty() => {
                if last_version != current_version {
                    tracing::info!("version_updated: {} -> {}", last_version, current_version);

                    let payload = UpdatedEvent {
                        previous: last_version,
                        current: current_version.clone(),
                    };

                    if let Err(e) = self.emit("plugin:updater2:updated", payload) {
                        tracing::error!("failed_to_emit_updated_event: {}", e);
                    }

                    if let Err(e) = self.set_last_seen_version(current_version) {
                        tracing::error!("failed_to_update_version: {}", e);
                    }
                }
            }
            Ok(Some(_)) | Ok(None) => {
                if is_existing_install {
                    tracing::info!(
                        "existing_user_migration: showing changelog for {}",
                        current_version
                    );
                    let payload = UpdatedEvent {
                        previous: "pre-changelog".to_string(),
                        current: current_version.clone(),
                    };
                    if let Err(e) = self.emit("plugin:updater2:updated", payload) {
                        tracing::error!("failed_to_emit_updated_event: {}", e);
                    }
                } else {
                    tracing::info!("first_install: storing version {}", current_version);
                }

                if let Err(e) = self.set_last_seen_version(current_version) {
                    tracing::error!("failed_to_store_initial_version: {}", e);
                }
            }
            Err(e) => {
                tracing::error!("failed_to_get_last_seen_version: {}", e);
            }
        }
    }
}
