use std::{future::Future, sync::mpsc, sync::Arc};
use tokio::time::{timeout, Duration};

use crate::error::Error;
use tauri_plugin_store2::StorePluginExt;

pub trait NotificationPluginExt<R: tauri::Runtime> {
    fn notification_store(&self) -> tauri_plugin_store2::ScopedStore<R, crate::StoreKey>;

    fn get_event_notification(&self) -> Result<bool, Error>;
    fn set_event_notification(&self, enabled: bool) -> Result<(), Error>;

    fn get_detect_notification(&self) -> Result<bool, Error>;
    fn set_detect_notification(&self, enabled: bool) -> Result<(), Error>;

    fn start_event_notification(&self) -> impl Future<Output = Result<(), Error>>;
    fn stop_event_notification(&self) -> Result<(), Error>;

    fn start_detect_notification(&self) -> Result<(), Error>;
    fn stop_detect_notification(&self) -> Result<(), Error>;

    fn get_auto_record_enabled(&self) -> Result<bool, Error>;
    fn set_auto_record_enabled(&self, enabled: bool) -> Result<(), Error>;

    fn get_auto_record_threshold(&self) -> Result<f64, Error>;
    fn set_auto_record_threshold(&self, threshold: f64) -> Result<(), Error>;

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
            (
                guard.db.clone().expect("db"),
                guard.user_id.clone().expect("user_id"),
            )
        };

        let state = self.state::<crate::SharedState>();
        let mut s = state.lock().unwrap();
        let meeting_detector = s.meeting_detector.clone();

        s.worker_handle = Some(tokio::runtime::Handle::current().spawn(async move {
            let config = Arc::new(crate::worker::NotificationConfig::default());
            let _ = crate::worker::monitor(crate::worker::WorkerState {
                db,
                user_id,
                config,
                meeting_detector,
            })
            .await;
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
        let auto_record_enabled = self.get_auto_record_enabled().unwrap_or(false);
        let auto_record_threshold = self.get_auto_record_threshold().unwrap_or(0.7);

        let state = self.state::<crate::SharedState>();

        // Update meeting detector configuration
        {
            let state_guard = state.lock().unwrap();
            state_guard
                .meeting_detector
                .set_auto_record_config(auto_record_enabled, auto_record_threshold);
        }

        // Create callback that integrates with meeting detector
        let meeting_detector = {
            let state_guard = state.lock().unwrap();
            state_guard.meeting_detector.clone()
        };

        let cb = hypr_detect::new_callback(move |bundle_id| {
            // Process mic detection signal
            let signal = crate::meeting_detection::MeetingSignal::MicrophoneActive;

            if let Some(score) = meeting_detector.process_signal(signal) {
                // Auto-recording was triggered
                let notif = hypr_notification2::Notification {
                    title: "Meeting detected".to_string(),
                    message: format!(
                        "Auto-recording started (confidence: {:.1}%)",
                        score.confidence * 100.0
                    ),
                    url: Some("hypr://notification".to_string()),
                    timeout: Some(std::time::Duration::from_secs(10)),
                };
                hypr_notification2::show(notif);
            } else if auto_record_enabled {
                // Auto-recording is enabled but confidence too low
                let notif = hypr_notification2::Notification {
                    title: "Meeting detected".to_string(),
                    message: "Confidence too low for auto-recording".to_string(),
                    url: Some("hypr://notification".to_string()),
                    timeout: Some(std::time::Duration::from_secs(10)),
                };
                hypr_notification2::show(notif);
            } else {
                // Auto-recording disabled, show manual prompt
                let notif = hypr_notification2::Notification {
                    title: "Meeting detected".to_string(),
                    message: "Click here to start writing a note".to_string(),
                    url: Some("hypr://notification".to_string()),
                    timeout: Some(std::time::Duration::from_secs(10)),
                };
                hypr_notification2::show(notif);
            }

            tracing::debug!(
                "meeting_detected: bundle_id={}, auto_enabled={}",
                bundle_id,
                auto_record_enabled
            );
        });

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
    fn get_auto_record_enabled(&self) -> Result<bool, Error> {
        let store = self.notification_store();
        store
            .get(crate::StoreKey::AutoRecordEnabled)
            .map_err(Error::Store)
            .map(|v| v.unwrap_or(false))
    }

    #[tracing::instrument(skip(self))]
    fn set_auto_record_enabled(&self, enabled: bool) -> Result<(), Error> {
        let store = self.notification_store();
        store
            .set(crate::StoreKey::AutoRecordEnabled, enabled)
            .map_err(Error::Store)
    }

    #[tracing::instrument(skip(self))]
    fn get_auto_record_threshold(&self) -> Result<f64, Error> {
        let store = self.notification_store();
        store
            .get(crate::StoreKey::AutoRecordThreshold)
            .map_err(Error::Store)
            .map(|v| v.unwrap_or(0.7))
    }

    #[tracing::instrument(skip(self))]
    fn set_auto_record_threshold(&self, threshold: f64) -> Result<(), Error> {
        let store = self.notification_store();
        store
            .set(crate::StoreKey::AutoRecordThreshold, threshold)
            .map_err(Error::Store)
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
