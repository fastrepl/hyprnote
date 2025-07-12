use crate::error::Error;
use std::future::Future;
use tauri_plugin_store2::StorePluginExt;

const MEETING_APPS: &[&str] = &[
    "Zoom",
    "Microsoft Teams",
    "Google Chrome",
    "Slack",
    "Discord",
    "FaceTime",
    "Cisco Webex Meeting",
];

pub trait AutoRecordingPluginExt<R: tauri::Runtime> {
    fn auto_recording_store(
        &self,
    ) -> Result<tauri_plugin_store2::ScopedStore<R, crate::error::StoreKey>, Error>;

    fn get_auto_recording_enabled(&self) -> Result<bool, Error>;
    fn set_auto_recording_enabled(&self, enabled: bool) -> Result<(), Error>;

    fn get_auto_record_on_scheduled(&self) -> Result<bool, Error>;
    fn set_auto_record_on_scheduled(&self, enabled: bool) -> Result<(), Error>;

    fn get_auto_record_on_ad_hoc(&self) -> Result<bool, Error>;
    fn set_auto_record_on_ad_hoc(&self, enabled: bool) -> Result<(), Error>;

    fn get_notify_before_meeting(&self) -> Result<bool, Error>;
    fn set_notify_before_meeting(&self, enabled: bool) -> Result<(), Error>;

    fn get_require_window_focus(&self) -> Result<bool, Error>;
    fn set_require_window_focus(&self, enabled: bool) -> Result<(), Error>;

    fn get_minutes_before_notification(&self) -> Result<u32, Error>;
    fn set_minutes_before_notification(&self, minutes: u32) -> Result<(), Error>;

    fn get_auto_stop_on_meeting_end(&self) -> Result<bool, Error>;
    fn set_auto_stop_on_meeting_end(&self, enabled: bool) -> Result<(), Error>;

    fn get_detection_confidence_threshold(&self) -> Result<f32, Error>;
    fn set_detection_confidence_threshold(&self, threshold: f32) -> Result<(), Error>;

    fn start_auto_recording_monitor(&self) -> impl Future<Output = Result<(), Error>>;
    fn stop_auto_recording_monitor(&self) -> Result<(), Error>;

    fn trigger_recording_for_meeting(
        &self,
        meeting_id: String,
    ) -> impl Future<Output = Result<(), Error>>;
    fn stop_recording_for_meeting(
        &self,
        meeting_id: String,
    ) -> impl Future<Output = Result<(), Error>>;

    fn stop_recording_for_meeting_if_active(
        &self,
        bundle_id: String,
    ) -> impl Future<Output = Result<(), Error>>;

    fn is_meeting_window_focused(
        &self,
        meeting_id: &str,
    ) -> impl Future<Output = Result<bool, Error>>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> AutoRecordingPluginExt<R> for T {
    fn auto_recording_store(
        &self,
    ) -> Result<tauri_plugin_store2::ScopedStore<R, crate::error::StoreKey>, Error> {
        self.scoped_store(crate::PLUGIN_NAME).map_err(Error::Store)
    }

    #[tracing::instrument(skip(self))]
    fn get_auto_recording_enabled(&self) -> Result<bool, Error> {
        let store = self.auto_recording_store()?;
        store
            .get(crate::error::StoreKey::AutoRecordingEnabled)
            .map_err(Error::Store)
            .map(|v| v.unwrap_or(false))
    }

    #[tracing::instrument(skip(self))]
    fn set_auto_recording_enabled(&self, enabled: bool) -> Result<(), Error> {
        let store = self.auto_recording_store()?;
        store
            .set(crate::error::StoreKey::AutoRecordingEnabled, enabled)
            .map_err(Error::Store)
    }

    #[tracing::instrument(skip(self))]
    fn get_auto_record_on_scheduled(&self) -> Result<bool, Error> {
        let store = self.auto_recording_store()?;
        store
            .get(crate::error::StoreKey::AutoRecordOnScheduled)
            .map_err(Error::Store)
            .map(|v| v.unwrap_or(true))
    }

    #[tracing::instrument(skip(self))]
    fn set_auto_record_on_scheduled(&self, enabled: bool) -> Result<(), Error> {
        let store = self.auto_recording_store()?;
        store
            .set(crate::error::StoreKey::AutoRecordOnScheduled, enabled)
            .map_err(Error::Store)
    }

    #[tracing::instrument(skip(self))]
    fn get_auto_record_on_ad_hoc(&self) -> Result<bool, Error> {
        let store = self.auto_recording_store()?;
        store
            .get(crate::error::StoreKey::AutoRecordOnAdHoc)
            .map_err(Error::Store)
            .map(|v| v.unwrap_or(true))
    }

    #[tracing::instrument(skip(self))]
    fn set_auto_record_on_ad_hoc(&self, enabled: bool) -> Result<(), Error> {
        let store = self.auto_recording_store()?;
        store
            .set(crate::error::StoreKey::AutoRecordOnAdHoc, enabled)
            .map_err(Error::Store)
    }

    #[tracing::instrument(skip(self))]
    fn get_notify_before_meeting(&self) -> Result<bool, Error> {
        let store = self.auto_recording_store()?;
        store
            .get(crate::error::StoreKey::NotifyBeforeMeeting)
            .map_err(Error::Store)
            .map(|v| v.unwrap_or(true))
    }

    #[tracing::instrument(skip(self))]
    fn set_notify_before_meeting(&self, enabled: bool) -> Result<(), Error> {
        let store = self.auto_recording_store()?;
        store
            .set(crate::error::StoreKey::NotifyBeforeMeeting, enabled)
            .map_err(Error::Store)
    }

    #[tracing::instrument(skip(self))]
    fn get_require_window_focus(&self) -> Result<bool, Error> {
        let store = self.auto_recording_store()?;
        store
            .get(crate::error::StoreKey::RequireWindowFocus)
            .map_err(Error::Store)
            .map(|v| v.unwrap_or(false))
    }

    #[tracing::instrument(skip(self))]
    fn set_require_window_focus(&self, enabled: bool) -> Result<(), Error> {
        let store = self.auto_recording_store()?;
        store
            .set(crate::error::StoreKey::RequireWindowFocus, enabled)
            .map_err(Error::Store)
    }

    #[tracing::instrument(skip(self))]
    fn get_minutes_before_notification(&self) -> Result<u32, Error> {
        let store = self.auto_recording_store()?;
        store
            .get(crate::error::StoreKey::MinutesBeforeNotification)
            .map_err(Error::Store)
            .map(|v| v.unwrap_or(5))
    }

    #[tracing::instrument(skip(self))]
    fn set_minutes_before_notification(&self, minutes: u32) -> Result<(), Error> {
        let store = self.auto_recording_store()?;
        store
            .set(crate::error::StoreKey::MinutesBeforeNotification, minutes)
            .map_err(Error::Store)
    }

    #[tracing::instrument(skip(self))]
    fn get_auto_stop_on_meeting_end(&self) -> Result<bool, Error> {
        let store = self.auto_recording_store()?;
        store
            .get(crate::error::StoreKey::AutoStopOnMeetingEnd)
            .map_err(Error::Store)
            .map(|v| v.unwrap_or(true))
    }

    #[tracing::instrument(skip(self))]
    fn set_auto_stop_on_meeting_end(&self, enabled: bool) -> Result<(), Error> {
        let store = self.auto_recording_store()?;
        store
            .set(crate::error::StoreKey::AutoStopOnMeetingEnd, enabled)
            .map_err(Error::Store)
    }

    #[tracing::instrument(skip(self))]
    fn get_detection_confidence_threshold(&self) -> Result<f32, Error> {
        let store = self.auto_recording_store()?;
        store
            .get(crate::error::StoreKey::DetectionConfidenceThreshold)
            .map_err(Error::Store)
            .map(|v| v.unwrap_or(0.7))
    }

    #[tracing::instrument(skip(self))]
    fn set_detection_confidence_threshold(&self, threshold: f32) -> Result<(), Error> {
        let store = self.auto_recording_store()?;
        store
            .set(
                crate::error::StoreKey::DetectionConfidenceThreshold,
                threshold.clamp(0.0, 1.0),
            )
            .map_err(Error::Store)
    }

    #[tracing::instrument(skip(self))]
    async fn start_auto_recording_monitor(&self) -> Result<(), Error> {
        let state = self.state::<crate::ManagedState>();

        // Check if detector already exists
        {
            let guard = state
                .lock()
                .map_err(|_| Error::Detection(anyhow::anyhow!("Failed to lock shared state")))?;
            if guard.detector.is_some() {
                return Ok(());
            }
        } // guard is dropped here

        let mut detector = hypr_meeting_detector::MeetingDetector::new();

        let app_handle = self.app_handle().clone();
        let callback = std::sync::Arc::new(move |event: hypr_meeting_detector::MeetingEvent| {
            let app_handle = app_handle.clone();
            tokio::spawn(async move {
                if let Err(e) = crate::handle_meeting_event(app_handle, event).await {
                    tracing::error!("Failed to handle meeting event: {}", e);
                }
            });
        });

        detector.add_callback(callback).await;

        let db_state = self.state::<tauri_plugin_db::ManagedState>();
        let (db, user_id) = {
            let guard = db_state.lock().await;
            (
                guard
                    .db
                    .clone()
                    .ok_or_else(|| Error::Detection(anyhow::anyhow!("Database not initialized")))?,
                guard
                    .user_id
                    .clone()
                    .ok_or_else(|| Error::Detection(anyhow::anyhow!("User ID not set")))?,
            )
        };

        let upcoming_meetings = crate::get_upcoming_meetings(&db, &user_id).await?;
        detector.set_scheduled_meetings(upcoming_meetings).await;

        // Get notification timing from configuration
        let minutes_before = self.get_minutes_before_notification().unwrap_or(5);

        detector
            .start_detection(Some(minutes_before))
            .await
            .map_err(Error::Detection)?;

        // Store the detector
        {
            let mut guard = state
                .lock()
                .map_err(|_| Error::Detection(anyhow::anyhow!("Failed to lock shared state")))?;
            guard.detector = Some(detector);
        } // guard is dropped here

        Ok(())
    }

    #[tracing::instrument(skip(self))]
    fn stop_auto_recording_monitor(&self) -> Result<(), Error> {
        let state = self.state::<crate::ManagedState>();
        let mut guard = state
            .lock()
            .map_err(|_| Error::Detection(anyhow::anyhow!("Failed to lock shared state")))?;

        if let Some(mut detector) = guard.detector.take() {
            tokio::spawn(async move {
                detector.stop_detection().await;
            });
        }

        Ok(())
    }

    #[tracing::instrument(skip(self))]
    async fn trigger_recording_for_meeting(&self, meeting_id: String) -> Result<(), Error> {
        use tauri_plugin_listener::ListenerPluginExt;

        if !self.get_auto_recording_enabled()? {
            return Ok(());
        }

        // Check if window focus is required and if meeting window is focused
        if self.get_require_window_focus()? {
            if !self.is_meeting_window_focused(&meeting_id).await? {
                tracing::info!(
                    "Meeting window not focused, skipping auto-recording for: {}",
                    meeting_id
                );
                return Ok(());
            }
        }

        // Generate a unique session ID for this meeting
        let session_id = format!("session_{}", uuid::Uuid::new_v4());

        // Store the mapping between meeting_id/bundle_id and session_id
        {
            let state = self.state::<crate::ManagedState>();
            let mut guard = state
                .lock()
                .map_err(|_| Error::Detection(anyhow::anyhow!("Failed to lock shared state")))?;
            guard
                .active_sessions
                .insert(meeting_id.clone(), session_id.clone());
        }

        self.start_session(session_id.clone()).await;

        tracing::info!(
            "Auto-started recording for meeting: {} with session: {}",
            meeting_id,
            session_id
        );
        Ok(())
    }

    /// Check if any meeting app window is currently focused.
    /// Note: meeting_id parameter is currently unused as we check focus for any meeting app
    /// rather than a specific meeting instance.
    async fn is_meeting_window_focused(&self, _meeting_id: &str) -> Result<bool, Error> {
        #[cfg(target_os = "macos")]
        {
            use std::process::Command;

            let meeting_apps_list = MEETING_APPS
                .iter()
                .map(|app| format!("\"{}\"", app))
                .collect::<Vec<_>>()
                .join(", ");

            let script = format!(
                r#"
            tell application "System Events"
                set frontmostApp to name of first application process whose frontmost is true
                set meetingApps to {{{}}}
                repeat with appName in meetingApps
                    if frontmostApp contains appName then
                        return true
                    end if
                end repeat
                return false
            end tell
            "#,
                meeting_apps_list
            );

            let output = Command::new("osascript")
                .arg("-e")
                .arg(&script)
                .output()
                .map_err(|e| Error::Io(e))?;

            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                return Err(Error::Detection(anyhow::anyhow!(
                    "AppleScript execution failed: {}",
                    stderr.trim()
                )));
            }

            let result = String::from_utf8_lossy(&output.stdout).trim().to_string();
            match result.as_str() {
                "true" => Ok(true),
                "false" => Ok(false),
                _ => Err(Error::Detection(anyhow::anyhow!(
                    "Unexpected AppleScript output: expected 'true' or 'false', got '{}'",
                    result
                ))),
            }
        }

        #[cfg(not(target_os = "macos"))]
        {
            // For non-macOS platforms, assume window is focused
            Ok(true)
        }
    }

    #[tracing::instrument(skip(self))]
    async fn stop_recording_for_meeting(&self, meeting_id: String) -> Result<(), Error> {
        use tauri_plugin_listener::ListenerPluginExt;

        // Remove the session mapping and stop the session
        {
            let state = self.state::<crate::ManagedState>();
            let mut guard = state
                .lock()
                .map_err(|_| Error::Detection(anyhow::anyhow!("Failed to lock shared state")))?;
            guard.active_sessions.remove(&meeting_id);
        }

        self.stop_session().await;
        tracing::info!("Auto-stopped recording for meeting: {}", meeting_id);

        Ok(())
    }

    #[tracing::instrument(skip(self))]
    async fn stop_recording_for_meeting_if_active(&self, bundle_id: String) -> Result<(), Error> {
        use tauri_plugin_listener::ListenerPluginExt;

        // Atomically check and remove active session to avoid race condition
        let should_stop = {
            let state = self.state::<crate::ManagedState>();
            let mut guard = state
                .lock()
                .map_err(|_| Error::Detection(anyhow::anyhow!("Failed to lock shared state")))?;
            guard.active_sessions.remove(&bundle_id).is_some()
        };

        if should_stop {
            self.stop_session().await;
            tracing::info!("Auto-stopped recording for bundle_id: {}", bundle_id);
        } else {
            tracing::info!(
                "No active recording session found for bundle_id: {}",
                bundle_id
            );
        }

        Ok(())
    }
}
