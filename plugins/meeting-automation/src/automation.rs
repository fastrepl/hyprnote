use crate::config::{AutomationConfig, MeetingDetectionEvent, MeetingEventType};
use crate::detector::{MeetingEventReceiver, UnifiedDetector};
use crate::Result;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Listener};
use tauri_plugin_listener::ListenerPluginExt;
use tauri_plugin_notification::NotificationPluginExt;
use tokio::sync::Mutex;
use tracing::{debug, error, info, warn};
use uuid::Uuid;

pub struct MeetingAutomation<R: tauri::Runtime> {
    detector: UnifiedDetector<R>,
    app_handle: AppHandle<R>,
    event_receiver: Arc<Mutex<MeetingEventReceiver>>,
    is_running: Arc<std::sync::atomic::AtomicBool>,
    event_handler: Option<tokio::task::JoinHandle<()>>,
    pending_notifications: Arc<Mutex<std::collections::HashMap<String, MeetingDetectionEvent>>>,
}

impl<R: tauri::Runtime> MeetingAutomation<R> {
    pub fn new(config: AutomationConfig, app_handle: AppHandle<R>) -> Result<Self> {
        let (detector, event_receiver) = UnifiedDetector::new(config, app_handle.clone())?;

        Ok(Self {
            detector,
            app_handle,
            event_receiver: Arc::new(Mutex::new(event_receiver)),
            is_running: Arc::new(std::sync::atomic::AtomicBool::new(false)),
            event_handler: None,
            pending_notifications: Arc::new(Mutex::new(std::collections::HashMap::new())),
        })
    }

    pub fn start(&mut self) -> Result<()> {
        if self.is_running.load(std::sync::atomic::Ordering::SeqCst) {
            return Err(crate::Error::AutomationAlreadyRunning);
        }

        info!("Starting meeting automation");

        self.detector.start()?;

        // Set up notification action listener
        let pending_notifications = self.pending_notifications.clone();
        let notification_app_handle = self.app_handle.clone();
        self.app_handle.listen("notification_action", move |event| {
            let pending_notifications = pending_notifications.clone();
            let app_handle = notification_app_handle.clone();
            tokio::spawn(async move {
                Self::handle_notification_action(event, pending_notifications, app_handle).await;
            });
        });

        let event_receiver = self.event_receiver.clone();
        let app_handle = self.app_handle.clone();
        let is_running = self.is_running.clone();
        let pending_notifications = self.pending_notifications.clone();

        let handle = tokio::spawn(async move {
            Self::handle_events(
                event_receiver,
                app_handle,
                is_running,
                pending_notifications,
            )
            .await;
        });

        self.event_handler = Some(handle);
        self.is_running
            .store(true, std::sync::atomic::Ordering::SeqCst);

        Ok(())
    }

    pub fn stop(&mut self) -> Result<()> {
        if !self.is_running.load(std::sync::atomic::Ordering::SeqCst) {
            return Err(crate::Error::AutomationNotRunning);
        }

        info!("Stopping meeting automation");

        if let Err(e) = self.detector.stop() {
            warn!("Error stopping detector: {}", e);
        }

        if let Some(handle) = self.event_handler.take() {
            handle.abort();
        }

        self.is_running
            .store(false, std::sync::atomic::Ordering::SeqCst);

        Ok(())
    }

    pub fn is_running(&self) -> bool {
        self.is_running.load(std::sync::atomic::Ordering::SeqCst)
    }

    pub fn update_config(&mut self, config: AutomationConfig) -> Result<()> {
        self.detector.update_config(config)?;
        Ok(())
    }

    pub fn test_detection(&self) -> Result<()> {
        self.detector.simulate_mic_activity()?;
        Ok(())
    }

    async fn handle_events(
        event_receiver: Arc<Mutex<MeetingEventReceiver>>,
        app_handle: AppHandle<R>,
        is_running: Arc<std::sync::atomic::AtomicBool>,
        pending_notifications: Arc<Mutex<std::collections::HashMap<String, MeetingDetectionEvent>>>,
    ) {
        let mut receiver = event_receiver.lock().await;

        while is_running.load(std::sync::atomic::Ordering::SeqCst) {
            if let Some(event) = receiver.recv().await {
                debug!("Processing meeting event: {:?}", event);

                if let Err(e) =
                    Self::process_meeting_event(&app_handle, event, &pending_notifications).await
                {
                    error!("Error processing meeting event: {}", e);
                }
            }
        }
    }

    async fn process_meeting_event(
        app_handle: &AppHandle<R>,
        event: MeetingDetectionEvent,
        pending_notifications: &Arc<
            Mutex<std::collections::HashMap<String, MeetingDetectionEvent>>,
        >,
    ) -> Result<()> {
        match event.event_type {
            MeetingEventType::AppLaunched => {
                info!("Meeting app launched: {}", event.app_name);

                let notification_id = format!("app_launched_{}", Uuid::new_v4());

                // Store the event for later action handling
                {
                    let mut pending = pending_notifications.lock().await;
                    pending.insert(notification_id.clone(), event.clone());
                }

                Self::show_notification_with_id(
                    app_handle,
                    &notification_id,
                    "Meeting Detected",
                    &format!("Are you in a meeting with {}?", event.app_name),
                    vec![
                        ("Start Recording".to_string(), "start_recording".to_string()),
                        ("Ignore".to_string(), "ignore".to_string()),
                    ],
                )
                .await?;

                // Only auto-start if specifically configured to do so
                // Removed automatic start - let user decide via notification
            }

            MeetingEventType::AppTerminated => {
                info!("Meeting app terminated: {}", event.app_name);
                Self::stop_recording(app_handle, &event).await?;
            }

            MeetingEventType::MicActivityDetected => {
                info!("Microphone activity detected");

                let notification_id = format!("mic_activity_{}", Uuid::new_v4());

                // Store the event for later action handling
                {
                    let mut pending = pending_notifications.lock().await;
                    pending.insert(notification_id.clone(), event.clone());
                }

                Self::show_notification_with_id(
                    app_handle,
                    &notification_id,
                    "Microphone Activity",
                    "Microphone activity detected. Start recording?",
                    vec![
                        ("Start Recording".to_string(), "start_recording".to_string()),
                        ("Ignore".to_string(), "ignore".to_string()),
                    ],
                )
                .await?;
            }

            MeetingEventType::MicActivityStopped => {
                info!("Microphone activity stopped");
                Self::show_notification(
                    app_handle,
                    "Microphone Inactive",
                    "Meeting might be ending. Continue recording?",
                    vec![
                        ("Continue".to_string(), "continue_recording".to_string()),
                        ("Stop Recording".to_string(), "stop_recording".to_string()),
                    ],
                )
                .await?;
            }

            MeetingEventType::ScheduledMeetingStarting => {
                let title = event.metadata.get("event_title").unwrap_or(&event.app_name);
                let default_minutes = "0".to_string();
                let minutes_until = event
                    .metadata
                    .get("minutes_until")
                    .unwrap_or(&default_minutes);

                if minutes_until == "0" {
                    info!("Scheduled meeting starting now: {}", title);
                    Self::start_recording(app_handle, &event).await?;
                } else {
                    info!(
                        "Scheduled meeting '{}' starting in {} minutes",
                        title, minutes_until
                    );

                    Self::show_notification(
                        app_handle,
                        "Meeting Starting Soon",
                        &format!("'{}' starts in {} minutes", title, minutes_until),
                        vec![
                            ("Start Recording".to_string(), "start_recording".to_string()),
                            ("Remind Me Later".to_string(), "remind_later".to_string()),
                        ],
                    )
                    .await?;
                }
            }

            MeetingEventType::WindowFocused => {
                debug!("Meeting app window focused: {}", event.app_name);

                info!("Window focus detected for meeting app: {}", event.app_name);

                Self::show_notification(
                    app_handle,
                    "Meeting Window Active",
                    &format!("Meeting window is now focused: {}", event.app_name),
                    vec![
                        ("Start Recording".to_string(), "start_recording".to_string()),
                        ("Ignore".to_string(), "ignore".to_string()),
                    ],
                )
                .await?;
            }

            MeetingEventType::WindowUnfocused => {
                debug!("Meeting app window unfocused: {}", event.app_name);
            }

            MeetingEventType::ScheduledMeetingEnding => {
                let title = event.metadata.get("event_title").unwrap_or(&event.app_name);
                info!("Scheduled meeting ending: {}", title);

                Self::show_notification(
                    app_handle,
                    "Meeting Ending",
                    &format!("'{}' is ending. Stop recording?", title),
                    vec![
                        ("Stop Recording".to_string(), "stop_recording".to_string()),
                        ("Continue".to_string(), "continue_recording".to_string()),
                    ],
                )
                .await?;
            }

            _ => {
                debug!("Unhandled meeting event type: {:?}", event.event_type);
            }
        }

        Ok(())
    }

    async fn start_recording(
        app_handle: &AppHandle<R>,
        event: &MeetingDetectionEvent,
    ) -> Result<()> {
        info!("Starting recording for meeting: {}", event.app_name);

        let session_id = format!(
            "meeting-{}-{}",
            event.app_bundle_id.replace(".", "-"),
            Uuid::new_v4().to_string()[..8].to_string()
        );

        let app_handle_clone = app_handle.clone();
        let session_id_clone = session_id.clone();
        let event_clone = event.clone();

        tokio::spawn(async move {
            // Use proper ListenerPluginExt API to start recording
            app_handle_clone
                .start_session(session_id_clone.clone())
                .await;
            info!(
                "Successfully started recording session: {}",
                session_id_clone
            );

            if let Err(e) = app_handle_clone.emit("recording_auto_started", &event_clone) {
                error!("Failed to emit recording_auto_started event: {}", e);
            }
        });

        Ok(())
    }

    async fn stop_recording(
        app_handle: &AppHandle<R>,
        event: &MeetingDetectionEvent,
    ) -> Result<()> {
        info!("Stopping recording for meeting: {}", event.app_name);

        let app_handle_clone = app_handle.clone();
        let event_clone = event.clone();

        tokio::spawn(async move {
            // Use proper ListenerPluginExt API to stop recording
            app_handle_clone.stop_session().await;
            info!("Successfully stopped recording session");

            if let Err(e) = app_handle_clone.emit("recording_auto_stopped", &event_clone) {
                error!("Failed to emit recording_auto_stopped event: {}", e);
            }
        });

        Ok(())
    }

    async fn show_notification(
        app_handle: &AppHandle<R>,
        title: &str,
        message: &str,
        actions: Vec<(String, String)>,
    ) -> Result<()> {
        info!("Showing notification: {} - {}", title, message);

        // Use existing notification plugin for proper native notifications
        let notification = hypr_notification2::Notification {
            title: title.to_string(),
            message: message.to_string(),
            url: Some("hyprnote://meeting-automation".to_string()),
            timeout: Some(std::time::Duration::from_secs(10)),
        };

        hypr_notification2::show(notification);

        // Also emit event for UI handling
        let notification_data = serde_json::json!({
            "title": title,
            "message": message,
            "actions": actions,
        });

        if let Err(e) = app_handle.emit("meeting_notification", &notification_data) {
            error!("Failed to emit meeting_notification event: {}", e);
        }

        Ok(())
    }

    async fn show_notification_with_id(
        app_handle: &AppHandle<R>,
        notification_id: &str,
        title: &str,
        message: &str,
        actions: Vec<(String, String)>,
    ) -> Result<()> {
        info!("Showing notification: {} - {}", title, message);

        // Use existing notification plugin for proper native notifications
        let notification = hypr_notification2::Notification {
            title: title.to_string(),
            message: message.to_string(),
            url: Some("hyprnote://meeting-automation".to_string()),
            timeout: Some(std::time::Duration::from_secs(10)),
        };

        hypr_notification2::show(notification);

        // Also emit event for UI handling with notification ID
        let notification_data = serde_json::json!({
            "id": notification_id,
            "title": title,
            "message": message,
            "actions": actions,
        });

        if let Err(e) = app_handle.emit("meeting_notification", &notification_data) {
            error!("Failed to emit meeting_notification event: {}", e);
        }

        Ok(())
    }

    async fn handle_notification_action(
        event: tauri::Event,
        pending_notifications: Arc<Mutex<std::collections::HashMap<String, MeetingDetectionEvent>>>,
        app_handle: AppHandle<R>,
    ) {
        if let Ok(payload) = serde_json::from_str::<serde_json::Value>(&event.payload()) {
            let notification_id = payload.get("notification_id").and_then(|v| v.as_str());
            let action = payload.get("action").and_then(|v| v.as_str());

            if let (Some(notification_id), Some(action)) = (notification_id, action) {
                info!(
                    "Processing notification action: {} for {}",
                    action, notification_id
                );

                // Get the original event from pending notifications
                let original_event = {
                    let mut pending = pending_notifications.lock().await;
                    pending.remove(notification_id)
                };

                if let Some(event) = original_event {
                    match action {
                        "start_recording" => {
                            info!("User chose to start recording for: {}", event.app_name);
                            if let Err(e) = Self::start_recording(&app_handle, &event).await {
                                error!("Failed to start recording: {}", e);
                            }
                        }
                        "stop_recording" => {
                            info!("User chose to stop recording for: {}", event.app_name);
                            if let Err(e) = Self::stop_recording(&app_handle, &event).await {
                                error!("Failed to stop recording: {}", e);
                            }
                        }
                        "ignore" => {
                            info!("User chose to ignore notification for: {}", event.app_name);
                        }
                        "continue_recording" => {
                            info!("User chose to continue recording for: {}", event.app_name);
                            // Do nothing - just keep recording
                        }
                        "remind_later" => {
                            info!("User chose to be reminded later for: {}", event.app_name);
                            // Could implement a reminder system here
                        }
                        _ => {
                            warn!("Unknown notification action: {}", action);
                        }
                    }
                } else {
                    warn!("No pending notification found for ID: {}", notification_id);
                }
            } else {
                error!("Invalid notification action payload: {}", event.payload());
            }
        } else {
            error!(
                "Failed to parse notification action payload: {}",
                event.payload()
            );
        }
    }
}
