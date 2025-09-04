use std::future::Future;

use crate::error::Error;
use tauri_plugin_store2::StorePluginExt;

pub trait NotificationPluginExt<R: tauri::Runtime> {
    fn notification_store(&self) -> tauri_plugin_store2::ScopedStore<R, crate::StoreKey>;

    fn list_applications(&self) -> Vec<hypr_detect::InstalledApp>;
    fn show_notification(&self, v: hypr_notification::Notification) -> Result<(), Error>;

    fn get_respect_do_not_disturb(&self) -> Result<bool, Error>;
    fn set_respect_do_not_disturb(&self, enabled: bool) -> Result<(), Error>;

    fn get_event_notification(&self) -> Result<bool, Error>;
    fn set_event_notification(&self, enabled: bool) -> Result<(), Error>;

    fn get_detect_notification(&self) -> Result<bool, Error>;
    fn set_detect_notification(&self, enabled: bool) -> Result<(), Error>;

    fn get_ignored_platforms(&self) -> Result<Vec<String>, Error>;
    fn set_ignored_platforms(&self, platforms: Vec<String>) -> Result<(), Error>;

    fn start_event_notification(&self) -> impl Future<Output = Result<(), Error>>;
    fn stop_event_notification(&self) -> Result<(), Error>;

    fn start_detect_notification(&self) -> Result<(), Error>;
    fn stop_detect_notification(&self) -> Result<(), Error>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> NotificationPluginExt<R> for T {
    fn notification_store(&self) -> tauri_plugin_store2::ScopedStore<R, crate::StoreKey> {
        self.scoped_store(crate::PLUGIN_NAME).unwrap()
    }

    fn list_applications(&self) -> Vec<hypr_detect::InstalledApp> {
        #[cfg(target_os = "macos")]
        return hypr_detect::list_installed_apps();

        #[cfg(not(target_os = "macos"))]
        return Vec::new();
    }

    #[tracing::instrument(skip(self))]
    fn show_notification(&self, v: hypr_notification::Notification) -> Result<(), Error> {
        hypr_notification::show(&v);
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
            .and_then(|v| {
                if enabled {
                    #[cfg(target_os = "macos")]
                    {
                        let app = self.app_handle().clone();
                        let _ = hypr_intercept::setup_quit_handler(crate::create_quit_handler(app));
                    }
                } else if self.get_detect_notification().unwrap_or(false) {
                    #[cfg(target_os = "macos")]
                    let _ = hypr_intercept::reset_quit_handler();
                }

                Ok(v)
            })
            .map_err(Error::Store)
    }

    #[tracing::instrument(skip(self))]
    fn get_respect_do_not_disturb(&self) -> Result<bool, Error> {
        let store = self.notification_store();
        store
            .get(crate::StoreKey::RespectDoNotDisturb)
            .map_err(Error::Store)
            .map(|v| v.unwrap_or(false))
    }

    #[tracing::instrument(skip(self))]
    fn set_respect_do_not_disturb(&self, enabled: bool) -> Result<(), Error> {
        let store = self.notification_store();
        store
            .set(crate::StoreKey::RespectDoNotDisturb, enabled)
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
            .and_then(|v| {
                if enabled {
                    #[cfg(target_os = "macos")]
                    {
                        let app = self.app_handle().clone();
                        let _ = hypr_intercept::setup_quit_handler(crate::create_quit_handler(app));
                    }
                } else if self.get_event_notification().unwrap_or(false) {
                    #[cfg(target_os = "macos")]
                    let _ = hypr_intercept::reset_quit_handler();
                }

                Ok(v)
            })
            .map_err(Error::Store)
    }

    #[tracing::instrument(skip(self))]
    fn get_ignored_platforms(&self) -> Result<Vec<String>, Error> {
        let store = self.notification_store();
        store
            .get(crate::StoreKey::IgnoredPlatforms)
            .map_err(Error::Store)
            .map(|v| v.unwrap_or_else(Vec::new))
    }

    #[tracing::instrument(skip(self))]
    fn set_ignored_platforms(&self, platforms: Vec<String>) -> Result<(), Error> {
        let store = self.notification_store();
        store
            .set(crate::StoreKey::IgnoredPlatforms, platforms)
            .map_err(Error::Store)
    }

    #[tracing::instrument(skip(self))]
    async fn start_event_notification(&self) -> Result<(), Error> {
        let db_state = self.state::<tauri_plugin_db::ManagedState>();
        let (db, user_id) = {
            let guard = db_state.lock().await;
            (
                guard.db.clone().expect("db"),
                guard.user_id.clone().expect("user_id"),
            )
        };

        {
            let state = self.state::<crate::SharedState>();
            let mut s = state.lock().unwrap();

            let notification_tx = s.notification_handler.sender().unwrap();

            if let Some(h) = s.worker_handle.take() {
                h.abort();
            }
            s.worker_handle = Some(tokio::runtime::Handle::current().spawn(async move {
                let _ = crate::event::monitor(crate::event::WorkerState {
                    db,
                    user_id,
                    notification_tx,
                })
                .await;
            }));
        }

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
        let state = self.state::<crate::SharedState>();
        let mut guard = state.lock().unwrap();

        guard.detect_state.start()
    }

    #[tracing::instrument(skip(self))]
    fn stop_detect_notification(&self) -> Result<(), Error> {
        let state = self.state::<crate::SharedState>();
        let mut guard = state.lock().unwrap();

        guard.detect_state.stop()
    }
}
