use std::future::Future;

use crate::error::Error;

pub trait NotificationPluginExt<R: tauri::Runtime> {
    fn list_applications(&self) -> Vec<hypr_detect::InstalledApp>;
    fn clear_notifications(&self) -> Result<(), Error>;
    fn show_notification(&self, v: hypr_notification::Notification) -> Result<(), Error>;

    fn start_event_notification(
        &self,
        params: crate::commands::EventNotificationParams,
    ) -> impl Future<Output = Result<(), Error>>;
    fn stop_event_notification(&self) -> Result<(), Error>;

    fn start_detect_notification(
        &self,
        params: crate::commands::DetectNotificationParams,
    ) -> Result<(), Error>;
    fn stop_detect_notification(&self) -> Result<(), Error>;

    fn start_notification_analytics(&self, user_id: String) -> Result<(), Error>;
    fn stop_notification_analytics(&self) -> Result<(), Error>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> NotificationPluginExt<R> for T {
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
    fn clear_notifications(&self) -> Result<(), Error> {
        hypr_notification::clear();
        Ok(())
    }

    #[tracing::instrument(skip(self))]
    async fn start_event_notification(
        &self,
        params: crate::commands::EventNotificationParams,
    ) -> Result<(), Error> {
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

            {
                let mut config = s.config.write().unwrap();
                config.respect_do_not_disturb = params.respect_do_not_disturb;
            }

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
    fn start_detect_notification(
        &self,
        params: crate::commands::DetectNotificationParams,
    ) -> Result<(), Error> {
        let state = self.state::<crate::SharedState>();
        let mut guard = state.lock().unwrap();

        {
            let mut config = guard.config.write().unwrap();
            config.respect_do_not_disturb = params.respect_do_not_disturb;
            config.ignored_platforms = params.ignored_platforms;
        }

        guard.detect_state.start()
    }

    #[tracing::instrument(skip(self))]
    fn stop_detect_notification(&self) -> Result<(), Error> {
        let state = self.state::<crate::SharedState>();
        let mut guard = state.lock().unwrap();

        guard.detect_state.stop()
    }

    fn start_notification_analytics(&self, user_id: String) -> Result<(), Error> {
        use hypr_notification::NotificationMutation;
        use tauri_plugin_analytics::{AnalyticsPayload, AnalyticsPluginExt};

        let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel::<NotificationMutation>();
        let app_handle = self.app_handle().clone();

        let confirm_tx = tx.clone();
        hypr_notification::setup_notification_confirm_handler(move |_id| {
            let _ = confirm_tx.send(NotificationMutation::Confirm);
        });

        let dismiss_tx = tx.clone();
        hypr_notification::setup_notification_dismiss_handler(move |_id| {
            let _ = dismiss_tx.send(NotificationMutation::Dismiss);
        });

        let analytics_task = tokio::spawn(async move {
            while let Some(event) = rx.recv().await {
                match event {
                    NotificationMutation::Confirm => {
                        let _ = app_handle
                            .event(
                                AnalyticsPayload::for_user(&user_id)
                                    .event("notification_confirm")
                                    .build(),
                            )
                            .await;
                    }
                    NotificationMutation::Dismiss => {
                        let _ = app_handle
                            .event(
                                AnalyticsPayload::for_user(&user_id)
                                    .event("notification_dismiss")
                                    .build(),
                            )
                            .await;
                    }
                }
            }
        });

        let state = self.state::<crate::SharedState>();
        let mut guard = state.lock().unwrap();

        if let Some(h) = guard.analytics_task.take() {
            h.abort();
        }
        guard.analytics_task = Some(analytics_task);

        Ok(())
    }

    #[tracing::instrument(skip(self))]
    fn stop_notification_analytics(&self) -> Result<(), Error> {
        let state = self.state::<crate::SharedState>();
        let mut guard = state.lock().unwrap();

        if let Some(h) = guard.analytics_task.take() {
            h.abort();
        }

        Ok(())
    }
}
