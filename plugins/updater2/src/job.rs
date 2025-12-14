use tauri_plugin_updater::UpdaterExt;
use tauri_specta::Event;

use crate::Updater2PluginExt;
use crate::events::UpdateReadyEvent;

pub async fn check_and_download_update<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    let Ok(updater) = app.updater() else {
        tracing::error!("failed_to_get_updater");
        return;
    };

    let update = match updater.check().await {
        Ok(Some(update)) => update,
        Ok(None) => {
            tracing::debug!("no_update_available");
            return;
        }
        Err(e) => {
            tracing::error!("failed_to_check_for_updates: {}", e);
            return;
        }
    };

    let version = update.version.clone();
    tracing::info!("update_available: {}", version);

    let bytes = match update.download(|_, _| {}, || {}).await {
        Ok(bytes) => bytes,
        Err(e) => {
            tracing::error!("failed_to_download_update: {}", e);
            return;
        }
    };
    tracing::info!("update_downloaded: {}", version);

    if let Err(e) = update.install(bytes) {
        tracing::error!("failed_to_install_update: {}", e);
        return;
    }
    tracing::info!("update_staged_for_restart: {}", version);

    if let Err(e) = app.set_pending_update_version(Some(version.clone())) {
        tracing::error!("failed_to_set_pending_update_version: {}", e);
    }

    if let Err(e) = (UpdateReadyEvent { version }).emit(app) {
        tracing::error!("failed_to_emit_update_ready_event: {}", e);
    }
}
