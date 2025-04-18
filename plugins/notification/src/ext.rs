use std::future::Future;
use std::sync::mpsc;
use tokio::time::{timeout, Duration};

use crate::error::NotificationError;

pub trait NotificationPluginExt<R: tauri::Runtime> {
    fn request_notification_permission(&self) -> Result<(), NotificationError>;
    fn check_notification_permission(
        &self,
    ) -> impl Future<Output = Result<hypr_notification2::NotificationPermission, NotificationError>>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> NotificationPluginExt<R> for T {
    fn request_notification_permission(&self) -> Result<(), NotificationError> {
        hypr_notification2::request_notification_permission();
        Ok(())
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
