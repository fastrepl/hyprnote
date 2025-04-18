use std::future::Future;
use std::sync::mpsc;
use tokio::time::{timeout, Duration};

use crate::error::NotificationError;
use tauri_plugin_store2::StorePluginExt;

pub trait NotificationPluginExt<R: tauri::Runtime> {
    fn notification_store(&self) -> tauri_plugin_store2::ScopedStore<R, crate::StoreKey>;

    fn get_event_notification(&self) -> Result<bool, NotificationError>;
    fn set_event_notification(&self, enabled: bool) -> Result<(), NotificationError>;

    fn get_detect_notification(&self) -> Result<bool, NotificationError>;
    fn set_detect_notification(&self, enabled: bool) -> Result<(), NotificationError>;

    fn open_notification_settings(&self) -> Result<(), NotificationError>;
    fn request_notification_permission(&self) -> Result<(), NotificationError>;
    fn check_notification_permission(
        &self,
    ) -> impl Future<Output = Result<hypr_notification2::NotificationPermission, NotificationError>>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> NotificationPluginExt<R> for T {
    fn notification_store(&self) -> tauri_plugin_store2::ScopedStore<R, crate::StoreKey> {
        self.scoped_store(crate::PLUGIN_NAME).unwrap()
    }

    fn get_event_notification(&self) -> Result<bool, NotificationError> {
        let store = self.notification_store();
        store
            .get(crate::StoreKey::EventNotification)
            .map_err(NotificationError::Store)
            .map(|v| v.unwrap_or(false))
    }

    fn set_event_notification(&self, enabled: bool) -> Result<(), NotificationError> {
        let store = self.notification_store();
        store
            .set(crate::StoreKey::EventNotification, enabled)
            .map_err(NotificationError::Store)
    }

    fn get_detect_notification(&self) -> Result<bool, NotificationError> {
        let store = self.notification_store();
        store
            .get(crate::StoreKey::DetectNotification)
            .map_err(NotificationError::Store)
            .map(|v| v.unwrap_or(false))
    }

    fn set_detect_notification(&self, enabled: bool) -> Result<(), NotificationError> {
        let store = self.notification_store();
        store
            .set(crate::StoreKey::DetectNotification, enabled)
            .map_err(NotificationError::Store)
    }

    fn request_notification_permission(&self) -> Result<(), NotificationError> {
        hypr_notification2::request_notification_permission();
        Ok(())
    }

    fn open_notification_settings(&self) -> Result<(), NotificationError> {
        hypr_notification2::open_notification_settings().map_err(NotificationError::Io)
    }

    async fn check_notification_permission(
        &self,
    ) -> Result<hypr_notification2::NotificationPermission, NotificationError> {
        let (tx, rx) = mpsc::channel();

        hypr_notification2::check_notification_permission(move |result| {
            let _ = tx.send(result);
        });

        timeout(Duration::from_secs(3), async move {
            rx.recv()
                .map_err(|_| NotificationError::ChannelClosed)
                .and_then(|result| result.map_err(|_| NotificationError::ChannelClosed))
        })
        .await
        .map_err(|_| NotificationError::PermissionTimeout)?
    }
}
