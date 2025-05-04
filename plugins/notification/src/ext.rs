use std::{future::Future, sync::mpsc};
use tokio::time::{timeout, Duration};

use crate::error::Error;
use tauri_plugin_store2::StorePluginExt;

pub trait NotificationPluginExt<R: tauri::Runtime> {
    fn notification_store(&self) -> tauri_plugin_store2::ScopedStore<R, crate::StoreKey>;

    fn send_notification(&self, notif: hypr_notification2::Notification) -> Result<(), Error>;

    fn get_event_notification(&self) -> Result<bool, Error>;
    fn set_event_notification(&self, enabled: bool) -> Result<(), Error>;

    fn get_detect_notification(&self) -> Result<bool, Error>;
    fn set_detect_notification(&self, enabled: bool) -> Result<(), Error>;

    fn start_event_notification(&self) -> impl Future<Output = Result<(), Error>>;
    fn stop_event_notification(&self) -> Result<(), Error>;

    fn start_detect_notification(&self) -> Result<(), Error>;
    fn stop_detect_notification(&self) -> Result<(), Error>;

    fn open_notification_settings(&self) -> Result<(), Error>;
    fn request_notification_permission(&self) -> Result<(), Error>;
    fn check_notification_permission(
        &self,
    ) -> impl Future<Output = Result<hypr_notification2::NotificationPermission, Error>>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> NotificationPluginExt<R> for T {
    fn notification_store(&self) -> tauri_plugin_store2::ScopedStore<R, crate::StoreKey> {
        self.scoped_store(crate::PLUGIN_NAME).unwrap()
    }

    fn send_notification(&self, notif: hypr_notification2::Notification) -> Result<(), Error> {
        hypr_notification2::show(notif);
        Ok(())
    }

    #[tracing::instrument(skip(self))]
    fn get_event_notification(&self) -> Result<bool, Error> {
        let store = self.notification_store();
        store
            .get(crate::StoreKey::EventNotification)
            .map_err(Error::Store)
            .map(|v| v.unwrap_or(false))
    }

    #[tracing::instrument(skip(self))]
    fn set_event_notification(&self, enabled: bool) -> Result<(), Error> {
        let store = self.notification_store();
        store
            .set(crate::StoreKey::EventNotification, enabled)
            .map_err(Error::Store)
    }

    #[tracing::instrument(skip(self))]
    fn get_detect_notification(&self) -> Result<bool, Error> {
        let store = self.notification_store();
        store
            .get(crate::StoreKey::DetectNotification)
            .map_err(Error::Store)
            .map(|v| v.unwrap_or(false))
    }

    #[tracing::instrument(skip(self))]
    fn set_detect_notification(&self, enabled: bool) -> Result<(), Error> {
        let store = self.notification_store();
        store
            .set(crate::StoreKey::DetectNotification, enabled)
            .map_err(Error::Store)
    }

    #[tracing::instrument(skip(self))]
    async fn start_event_notification(&self) -> Result<(), Error> {
        let db_state = self.state::<tauri_plugin_db::ManagedState>();
        let (db, user_id) = {
            let guard = db_state.lock().await;
            (guard.db.clone().unwrap(), guard.user_id.clone().unwrap())
        };

        let state = self.state::<crate::SharedState>();
        let mut s = state.lock().unwrap();

        s.worker_handle = Some(tokio::runtime::Handle::current().spawn(async move {
            let _ = crate::worker::monitor(crate::worker::WorkerState { db, user_id }).await;
        }));

        Ok(())
    }

    #[tracing::instrument(skip(self))]
    fn stop_event_notification(&self) -> Result<(), Error> {
        let state = self.state::<crate::SharedState>();
        let mut guard = state.lock().unwrap();

        if let Some(handle) = guard.worker_handle.take() {
            handle.abort();
        }

        Ok(())
    }

    #[tracing::instrument(skip(self))]
    fn start_detect_notification(&self) -> Result<(), Error> {
        let cb = hypr_detect::new_callback(move |_bundle_id| {
            let notif = hypr_notification2::Notification {
                title: "Meeting detected".to_string(),
                message: "Click here to start writing a note".to_string(),
                // TODO: This doesn't matter because we're hardcoding the destination in the deeplink handler
                url: Some("hypr://todo".to_string()),
                timeout: Some(std::time::Duration::from_secs(10)),
            };

            hypr_notification2::show(notif);
        });

        let state = self.state::<crate::SharedState>();
        {
            let mut guard = state.lock().unwrap();
            guard.detector.start(cb);
        }
        Ok(())
    }

    #[tracing::instrument(skip(self))]
    fn stop_detect_notification(&self) -> Result<(), Error> {
        let state = self.state::<crate::SharedState>();
        {
            let mut guard = state.lock().unwrap();
            guard.detector.stop();
        }
        Ok(())
    }

    #[tracing::instrument(skip(self))]
    fn open_notification_settings(&self) -> Result<(), Error> {
        hypr_notification2::open_notification_settings().map_err(Error::Io)
    }

    #[tracing::instrument(skip(self))]
    fn request_notification_permission(&self) -> Result<(), Error> {
        #[cfg(target_os = "macos")]
        let _ = hypr_detect::Detector::default().macos_request_accessibility_permission();

        hypr_notification2::request_notification_permission();

        Ok(())
    }

    #[tracing::instrument(skip(self))]
    async fn check_notification_permission(
        &self,
    ) -> Result<hypr_notification2::NotificationPermission, Error> {
        let (tx, rx) = mpsc::channel();

        hypr_notification2::check_notification_permission(move |result| {
            let _ = tx.send(result);
        });

        timeout(Duration::from_secs(3), async move {
            rx.recv()
                .map_err(|_| Error::ChannelClosed)
                .and_then(|result| result.map_err(|_| Error::ChannelClosed))
        })
        .await
        .map_err(|_| Error::PermissionTimeout)?
    }
}
