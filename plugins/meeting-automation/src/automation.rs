use crate::config::{AutomationConfig, MeetingDetectionEvent, MeetingEventType};
use crate::detector::{MeetingEventReceiver, UnifiedDetector};
use crate::Result;
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::sync::Mutex;
use tracing::{debug, error, info, warn};

pub struct MeetingAutomation<R: tauri::Runtime> {
    detector: UnifiedDetector,
    app_handle: AppHandle<R>,
    event_receiver: Arc<Mutex<MeetingEventReceiver>>,
    is_running: Arc<std::sync::atomic::AtomicBool>,
    event_handler: Option<tokio::task::JoinHandle<()>>,
}

impl<R: tauri::Runtime> MeetingAutomation<R> {
    pub fn new(config: AutomationConfig, app_handle: AppHandle<R>) -> Result<Self> {
        let (detector, event_receiver) = UnifiedDetector::new(config)?;

        Ok(Self {
            detector,
            app_handle,
            event_receiver: Arc::new(Mutex::new(event_receiver)),
            is_running: Arc::new(std::sync::atomic::AtomicBool::new(false)),
            event_handler: None,
        })
    }

    pub fn start(&mut self) -> Result<()> {
        if self.is_running.load(std::sync::atomic::Ordering::SeqCst) {
            return Err(crate::Error::AutomationAlreadyRunning);
        }

        info!("Starting meeting automation");

        self.detector.start()?;

        let event_receiver = self.event_receiver.clone();
        let app_handle = self.app_handle.clone();
        let is_running = self.is_running.clone();

        let handle = tokio::spawn(async move {
            Self::handle_events(event_receiver, app_handle, is_running).await;
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
    ) {
        let mut receiver = event_receiver.lock().await;

        while is_running.load(std::sync::atomic::Ordering::SeqCst) {
            if let Some(event) = receiver.recv().await {
                debug!("Processing meeting event: {:?}", event);

                if let Err(e) = Self::process_meeting_event(&app_handle, event).await {
                    error!("Error processing meeting event: {}", e);
                }
            }
        }
    }

    async fn process_meeting_event(
        app_handle: &AppHandle<R>,
        event: MeetingDetectionEvent,
    ) -> Result<()> {
        match event.event_type {
            MeetingEventType::AppLaunched => {
                info!("Meeting app launched: {}", event.app_name);

                Self::show_notification(
                    app_handle,
                    "Meeting Detected",
                    &format!("Are you in a meeting with {}?", event.app_name),
                    vec![
                        ("Start Recording".to_string(), "start_recording".to_string()),
                        ("Ignore".to_string(), "ignore".to_string()),
                    ],
                )
                .await?;

                Self::start_recording(app_handle, &event).await?;
            }

            MeetingEventType::AppTerminated => {
                info!("Meeting app terminated: {}", event.app_name);
                Self::stop_recording(app_handle, &event).await?;
            }

            MeetingEventType::MicActivityDetected => {
                info!("Microphone activity detected");
                Self::start_recording(app_handle, &event).await?;
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

        if let Err(e) = app_handle.emit("recording_auto_started", &event) {
            error!("Failed to emit recording_auto_started event: {}", e);
        }

        Ok(())
    }

    async fn stop_recording(
        app_handle: &AppHandle<R>,
        event: &MeetingDetectionEvent,
    ) -> Result<()> {
        info!("Stopping recording for meeting: {}", event.app_name);

        if let Err(e) = app_handle.emit("recording_auto_stopped", &event) {
            error!("Failed to emit recording_auto_stopped event: {}", e);
        }

        Ok(())
    }

    async fn show_notification(
        app_handle: &AppHandle<R>,
        title: &str,
        message: &str,
        actions: Vec<(String, String)>,
    ) -> Result<()> {
        info!("Showing notification: {} - {}", title, message);

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
}
