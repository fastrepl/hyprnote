use tauri::Manager;
use tauri_plugin_store2::Store2PluginExt;
use tauri_specta::Event;

use crate::events::UpdatedEvent;

pub trait Updater2PluginExt<R: tauri::Runtime> {
    fn get_last_seen_version(&self) -> Result<Option<String>, crate::Error>;
    fn set_last_seen_version(&self, version: String) -> Result<(), crate::Error>;
    fn get_pending_update_version(&self) -> Result<Option<String>, crate::Error>;
    fn set_pending_update_version(&self, version: Option<String>) -> Result<(), crate::Error>;
    fn maybe_emit_updated(&self);
}

impl<R: tauri::Runtime, T: Manager<R>> crate::Updater2PluginExt<R> for T {
    fn get_last_seen_version(&self) -> Result<Option<String>, crate::Error> {
        let store = self.store2().scoped_store(crate::PLUGIN_NAME)?;
        let v = store.get(crate::StoreKey::LastSeenVersion)?;
        Ok(v)
    }

    fn set_last_seen_version(&self, version: String) -> Result<(), crate::Error> {
        let store = self.store2().scoped_store(crate::PLUGIN_NAME)?;
        store.set(crate::StoreKey::LastSeenVersion, version)?;
        Ok(())
    }

    fn get_pending_update_version(&self) -> Result<Option<String>, crate::Error> {
        let store = self.store2().scoped_store(crate::PLUGIN_NAME)?;
        let v: Option<String> = store.get(crate::StoreKey::PendingUpdateVersion)?;
        Ok(v.filter(|s| !s.is_empty()))
    }

    fn set_pending_update_version(&self, version: Option<String>) -> Result<(), crate::Error> {
        let store = self.store2().scoped_store(crate::PLUGIN_NAME)?;
        store.set(
            crate::StoreKey::PendingUpdateVersion,
            version.unwrap_or_default(),
        )?;
        Ok(())
    }

    fn maybe_emit_updated(&self) {
        let current_version = match self.config().version.as_ref() {
            Some(v) => v.clone(),
            None => {
                tracing::warn!("no_version_in_config");
                return;
            }
        };

        if let Err(e) = self.set_pending_update_version(None) {
            tracing::warn!("failed_to_clear_pending_update: {}", e);
        }

        let (should_emit, previous) = match self.get_last_seen_version() {
            Ok(Some(last_version)) if !last_version.is_empty() => {
                (last_version != current_version, Some(last_version))
            }
            Ok(_) => (true, None),
            Err(e) => {
                tracing::error!("failed_to_get_last_seen_version: {}", e);
                (false, None)
            }
        };

        if should_emit {
            let payload = UpdatedEvent {
                previous,
                current: current_version.clone(),
            };

            if let Err(e) = payload.emit(self.app_handle()) {
                tracing::error!("failed_to_emit_updated_event: {}", e);
            }
        }

        if let Err(e) = self.set_last_seen_version(current_version) {
            tracing::error!("failed_to_update_version: {}", e);
        }
    }
}
