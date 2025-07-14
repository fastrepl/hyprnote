use crate::config::AutomationConfig;
use crate::Result;
use chrono::{DateTime, Duration, Utc};
use hypr_db_user::get_events_in_range;
use hypr_detect::{new_callback, Detector};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_db::ManagedState;
use tauri_plugin_listener::ListenerPluginExt;
use tokio::time::{sleep, Duration as TokioDuration};
use tracing::{debug, error, info};
use uuid::Uuid;

#[derive(Debug, Clone)]
struct ScheduledEvent {
    id: String,
    title: String,
    start_time: DateTime<Utc>,
}

pub struct MeetingAutomation<R: tauri::Runtime> {
    config: AutomationConfig,
    app_handle: AppHandle<R>,
    detector: Option<Detector>,
    is_running: Arc<std::sync::atomic::AtomicBool>,
    detection_handles: Vec<tokio::task::JoinHandle<()>>,
}

impl<R: tauri::Runtime> MeetingAutomation<R> {
    pub fn new(config: AutomationConfig, app_handle: AppHandle<R>) -> Result<Self> {
        Ok(Self {
            config,
            app_handle,
            detector: None,
            is_running: Arc::new(std::sync::atomic::AtomicBool::new(false)),
            detection_handles: Vec::new(),
        })
    }

    pub fn start(&mut self) -> Result<()> {
        if self.is_running.load(std::sync::atomic::Ordering::SeqCst) {
            return Err(crate::Error::AutomationAlreadyRunning);
        }

        info!("Starting meeting automation");

        if self.config.auto_start_on_app_detection || self.config.auto_start_on_mic_activity {
            self.start_detect_detection()?;
        }

        if self.config.auto_start_scheduled_meetings {
            self.start_scheduled_detection()?;
        }

        if self.config.require_window_focus {
            self.start_window_detection()?;
        }

        self.is_running
            .store(true, std::sync::atomic::Ordering::SeqCst);
        Ok(())
    }

    pub fn is_running(&self) -> bool {
        self.is_running.load(std::sync::atomic::Ordering::SeqCst)
    }

    pub fn stop(&mut self) -> Result<()> {
        if !self.is_running.load(std::sync::atomic::Ordering::SeqCst) {
            return Err(crate::Error::AutomationNotRunning);
        }

        info!("Stopping meeting automation");

        if let Some(mut detector) = self.detector.take() {
            detector.stop();
        }

        for handle in self.detection_handles.drain(..) {
            handle.abort();
        }

        self.is_running
            .store(false, std::sync::atomic::Ordering::SeqCst);
        Ok(())
    }

    fn start_detect_detection(&mut self) -> Result<()> {
        info!("Starting app and microphone detection");

        let config = self.config.clone();
        let app_handle = self.app_handle.clone();

        let callback = new_callback(move |event_data: String| {
            debug!("Detection event: {}", event_data);

            if event_data.starts_with("app_launched:") {
                let bundle_id = event_data.replace("app_launched:", "");
                if config.auto_start_on_app_detection && config.is_supported_app(&bundle_id) {
                    Self::handle_app_launch(&app_handle, &config, &bundle_id);
                }
            } else if event_data.starts_with("app_terminated:") {
                let bundle_id = event_data.replace("app_terminated:", "");
                if config.auto_stop_on_app_exit && config.is_supported_app(&bundle_id) {
                    Self::handle_app_terminate(&app_handle, &config, &bundle_id);
                }
            } else if event_data == "microphone_in_use" {
                if config.auto_start_on_mic_activity {
                    Self::handle_mic_activity(&app_handle);
                }
            } else if event_data == "microphone_stopped" {
                Self::handle_mic_stopped(&app_handle);
            }
        });

        let mut detector = Detector::default();
        detector.start(callback);
        self.detector = Some(detector);

        Ok(())
    }

    fn start_scheduled_detection(&mut self) -> Result<()> {
        info!("Starting scheduled meeting detection");

        let is_running = self.is_running.clone();
        let pre_meeting_minutes = self.config.pre_meeting_notification_minutes;
        let app_handle = self.app_handle.clone();

        let handle = tokio::spawn(async move {
            while is_running.load(std::sync::atomic::Ordering::SeqCst) {
                let now = Utc::now();
                match Self::get_upcoming_events_from_db(
                    &app_handle,
                    now,
                    pre_meeting_minutes as i64,
                )
                .await
                {
                    Ok(upcoming_events) => {
                        for event in upcoming_events {
                            let time_until_meeting = event.start_time - now;
                            let minutes_until = time_until_meeting.num_minutes();

                            if minutes_until <= pre_meeting_minutes as i64 && minutes_until > 0 {
                                Self::show_notification(
                                    &app_handle,
                                    "Meeting Starting Soon",
                                    &format!(
                                        "'{}' starts in {} minutes",
                                        event.title, minutes_until
                                    ),
                                );
                            } else if minutes_until <= 0 && minutes_until > -5 {
                                Self::start_recording_for_scheduled(&app_handle, &event).await;
                            }
                        }
                    }
                    Err(e) => error!("Error getting upcoming events: {}", e),
                }
                sleep(TokioDuration::from_secs(30)).await;
            }
        });

        self.detection_handles.push(handle);
        Ok(())
    }

    fn start_window_detection(&mut self) -> Result<()> {
        info!("Starting window focus detection");

        let config = self.config.clone();
        let app_handle = self.app_handle.clone();
        let is_running = self.is_running.clone();

        let handle = tokio::spawn(async move {
            while is_running.load(std::sync::atomic::Ordering::SeqCst) {
                if let Ok(focused_app) = Self::get_focused_app().await {
                    if config.is_supported_app(&focused_app) {
                        let app_name = config.get_app_name(&focused_app);
                        Self::show_notification(
                            &app_handle,
                            "Meeting Window Active",
                            &format!("Meeting window is now focused: {}", app_name),
                        );
                    }
                }
                sleep(TokioDuration::from_secs(2)).await;
            }
        });

        self.detection_handles.push(handle);
        Ok(())
    }

    fn handle_app_launch(app_handle: &AppHandle<R>, config: &AutomationConfig, bundle_id: &str) {
        let app_name = config.get_app_name(bundle_id);
        let app_handle = app_handle.clone();
        let bundle_id = bundle_id.to_string();

        tokio::spawn(async move {
            info!("Meeting app launched: {}", app_name);
            Self::show_notification(
                &app_handle,
                "Meeting Detected",
                &format!("Are you in a meeting with {}?", app_name),
            );
            Self::start_recording(&app_handle, &app_name, Some(bundle_id)).await;
        });
    }

    fn handle_app_terminate(app_handle: &AppHandle<R>, config: &AutomationConfig, bundle_id: &str) {
        let app_name = config.get_app_name(bundle_id);
        let app_handle = app_handle.clone();

        tokio::spawn(async move {
            info!("Meeting app terminated: {}", app_name);
            Self::show_notification(
                &app_handle,
                "Meeting Ended",
                &format!("{} was closed. Stop recording?", app_name),
            );
            Self::stop_recording(&app_handle).await;
        });
    }

    fn handle_mic_activity(app_handle: &AppHandle<R>) {
        let app_handle = app_handle.clone();
        tokio::spawn(async move {
            info!("Microphone activity detected");
            Self::show_notification(
                &app_handle,
                "Microphone Activity",
                "Microphone activity detected. Start recording?",
            );
            Self::start_recording(&app_handle, "System Microphone", None).await;
        });
    }

    fn handle_mic_stopped(app_handle: &AppHandle<R>) {
        let app_handle = app_handle.clone();
        tokio::spawn(async move {
            info!("Microphone activity stopped");
            Self::show_notification(
                &app_handle,
                "Microphone Inactive",
                "Meeting might be ending. Continue recording?",
            );
        });
    }

    async fn start_recording(app_handle: &AppHandle<R>, app_name: &str, bundle_id: Option<String>) {
        info!("Starting recording for: {}", app_name);

        let session_id = match bundle_id {
            Some(bundle_id) => format!(
                "meeting-{}-{}",
                bundle_id.replace(".", "-"),
                Uuid::new_v4().to_string()[..8].to_string()
            ),
            None => format!(
                "meeting-mic-{}",
                Uuid::new_v4().to_string()[..8].to_string()
            ),
        };

        app_handle.start_session(session_id.clone()).await;
        info!("Successfully started recording session: {}", session_id);

        let event_data = serde_json::json!({
            "app_name": app_name,
            "session_id": session_id,
            "timestamp": Utc::now().to_rfc3339()
        });

        if let Err(e) = app_handle.emit("recording_auto_started", &event_data) {
            error!("Failed to emit recording_auto_started event: {}", e);
        }
    }

    async fn start_recording_for_scheduled(app_handle: &AppHandle<R>, event: &ScheduledEvent) {
        info!("Starting recording for scheduled meeting: {}", event.title);

        let session_id = format!(
            "scheduled-{}-{}",
            event.id,
            Uuid::new_v4().to_string()[..8].to_string()
        );

        app_handle.start_session(session_id.clone()).await;
        info!(
            "Successfully started recording session for scheduled meeting: {}",
            session_id
        );

        let event_data = serde_json::json!({
            "event_title": event.title,
            "session_id": session_id,
            "timestamp": Utc::now().to_rfc3339()
        });

        if let Err(e) = app_handle.emit("recording_auto_started", &event_data) {
            error!("Failed to emit recording_auto_started event: {}", e);
        }
    }

    async fn stop_recording(app_handle: &AppHandle<R>) {
        info!("Stopping recording session");
        app_handle.stop_session().await;

        let event_data = serde_json::json!({
            "timestamp": Utc::now().to_rfc3339()
        });

        if let Err(e) = app_handle.emit("recording_auto_stopped", &event_data) {
            error!("Failed to emit recording_auto_stopped event: {}", e);
        }
    }

    fn show_notification(app_handle: &AppHandle<R>, title: &str, message: &str) {
        info!("Showing notification: {} - {}", title, message);

        let notification = hypr_notification2::Notification {
            title: title.to_string(),
            message: message.to_string(),
            url: Some("hyprnote://meeting-automation".to_string()),
            timeout: Some(std::time::Duration::from_secs(10)),
        };

        hypr_notification2::show(notification);

        let notification_data = serde_json::json!({
            "title": title,
            "message": message,
            "timestamp": Utc::now().to_rfc3339()
        });

        if let Err(e) = app_handle.emit("meeting_notification", &notification_data) {
            error!("Failed to emit meeting_notification event: {}", e);
        }
    }

    async fn get_upcoming_events_from_db(
        app_handle: &AppHandle<R>,
        now: DateTime<Utc>,
        minutes_ahead: i64,
    ) -> Result<Vec<ScheduledEvent>> {
        let end_time = now + Duration::minutes(minutes_ahead);

        let db_state = app_handle.state::<ManagedState>();
        let db_guard = db_state.lock().await;
        let db = match &db_guard.db {
            Some(db) => db.clone(),
            None => {
                debug!("Database not available");
                return Ok(vec![]);
            }
        };
        drop(db_guard);

        match get_events_in_range(&db, now, end_time).await {
            Ok(db_events) => {
                let mut events = Vec::new();
                for db_event in db_events {
                    events.push(ScheduledEvent {
                        id: db_event.id,
                        title: db_event.name,
                        start_time: db_event.start_date,
                    });
                }
                events.sort_by(|a, b| a.start_time.cmp(&b.start_time));
                debug!("Returning {} upcoming events from database", events.len());
                Ok(events)
            }
            Err(e) => {
                error!("Failed to get events from database: {}", e);
                Ok(vec![])
            }
        }
    }

    async fn get_focused_app() -> Result<String> {
        #[cfg(target_os = "macos")]
        {
            use std::process::Command;

            let output = Command::new("osascript")
                .arg("-e")
                .arg("tell application \"System Events\" to get bundle identifier of first application process whose frontmost is true")
                .output()
                .map_err(|e| crate::Error::DetectionError(e.to_string()))?;

            if output.status.success() {
                let bundle_id = String::from_utf8_lossy(&output.stdout).trim().to_string();
                Ok(bundle_id)
            } else {
                Err(crate::Error::DetectionError(
                    "Failed to get focused app".to_string(),
                ))
            }
        }

        #[cfg(not(target_os = "macos"))]
        {
            Err(crate::Error::DetectionError(
                "Window focus detection not implemented for this platform".to_string(),
            ))
        }
    }
}
