use crate::config::{AutomationConfig, MeetingDetectionEvent, MeetingEventType};
use crate::Result;
use chrono::{DateTime, Duration, Utc};
use hypr_db_user::{
    get_events_in_range, ListEventFilter, ListEventFilterCommon, ListEventFilterSpecific,
};
use hypr_detect::{new_callback, Detector};
use std::collections::HashMap;
use std::sync::Arc;
use tauri::Manager;
use tauri_plugin_db::ManagedState;
use tokio::sync::mpsc;
use tokio::time::{sleep, Duration as TokioDuration};
use tracing::{debug, error, info};

pub type MeetingEventSender = mpsc::UnboundedSender<MeetingDetectionEvent>;
pub type MeetingEventReceiver = mpsc::UnboundedReceiver<MeetingDetectionEvent>;

pub struct UnifiedDetector<R: tauri::Runtime> {
    config: AutomationConfig,
    pub event_sender: MeetingEventSender,
    is_running: Arc<std::sync::atomic::AtomicBool>,
    detection_handles: Vec<tokio::task::JoinHandle<()>>,
    app_detector: Option<Detector>,
    app_handle: tauri::AppHandle<R>,
}

impl<R: tauri::Runtime> UnifiedDetector<R> {
    pub fn new(
        config: AutomationConfig,
        app_handle: tauri::AppHandle<R>,
    ) -> Result<(Self, MeetingEventReceiver)> {
        let (event_sender, event_receiver) = mpsc::unbounded_channel();

        let detector = Self {
            config,
            event_sender,
            is_running: Arc::new(std::sync::atomic::AtomicBool::new(false)),
            detection_handles: Vec::new(),
            app_detector: None,
            app_handle,
        };

        Ok((detector, event_receiver))
    }

    pub fn start(&mut self) -> Result<()> {
        if self.is_running.load(std::sync::atomic::Ordering::SeqCst) {
            return Err(crate::Error::AutomationAlreadyRunning);
        }

        info!("Starting unified meeting detection");

        if self.config.auto_start_on_app_detection {
            self.start_app_detection()?;
        }

        if self.config.auto_start_on_mic_activity {
            self.start_mic_detection()?;
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

    pub fn stop(&mut self) -> Result<()> {
        if !self.is_running.load(std::sync::atomic::Ordering::SeqCst) {
            return Err(crate::Error::AutomationNotRunning);
        }

        info!("Stopping unified meeting detection");

        if let Some(mut detector) = self.app_detector.take() {
            detector.stop();
        }

        for handle in self.detection_handles.drain(..) {
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
        self.config = config;

        if self.is_running() {
            self.stop()?;
            self.start()?;
        }

        Ok(())
    }

    fn start_app_detection(&mut self) -> Result<()> {
        info!("Starting app detection");

        let event_sender = self.event_sender.clone();
        let supported_apps = self.config.supported_apps.clone();

        let callback = new_callback(move |event_data: String| {
            debug!("Detected app event: {}", event_data);

            if event_data.starts_with("app_launched:") {
                let bundle_id = event_data.replace("app_launched:", "");
                if supported_apps.contains(&bundle_id) {
                    let app_name = Self::get_app_name_from_bundle_id(&bundle_id);
                    let event = MeetingDetectionEvent {
                        event_type: MeetingEventType::AppLaunched,
                        app_bundle_id: bundle_id.clone(),
                        app_name,
                        timestamp: Utc::now(),
                        metadata: HashMap::new(),
                    };

                    if let Err(e) = event_sender.send(event) {
                        error!("Failed to send app launch event: {}", e);
                    }
                }
            } else if event_data.starts_with("app_terminated:") {
                let bundle_id = event_data.replace("app_terminated:", "");
                if supported_apps.contains(&bundle_id) {
                    let app_name = Self::get_app_name_from_bundle_id(&bundle_id);
                    let event = MeetingDetectionEvent {
                        event_type: MeetingEventType::AppTerminated,
                        app_bundle_id: bundle_id.clone(),
                        app_name,
                        timestamp: Utc::now(),
                        metadata: HashMap::new(),
                    };

                    if let Err(e) = event_sender.send(event) {
                        error!("Failed to send app termination event: {}", e);
                    }
                }
            }
        });

        let mut detector = Detector::default();
        detector.start(callback);
        self.app_detector = Some(detector);

        Ok(())
    }

    fn start_mic_detection(&mut self) -> Result<()> {
        info!("Starting microphone detection");

        let event_sender = self.event_sender.clone();
        let is_running = self.is_running.clone();

        let handle = tokio::spawn(async move {
            let mut mic_detector = Detector::default();

            let callback_sender = event_sender.clone();
            let mic_callback = new_callback(move |event_type: String| match event_type.as_str() {
                "microphone_in_use" => {
                    debug!("Microphone activity detected");

                    let event = MeetingDetectionEvent {
                        event_type: MeetingEventType::MicActivityDetected,
                        app_bundle_id: "system".to_string(),
                        app_name: "System Microphone".to_string(),
                        timestamp: Utc::now(),
                        metadata: HashMap::new(),
                    };

                    if let Err(e) = callback_sender.send(event) {
                        error!("Failed to send microphone activity event: {}", e);
                    }
                }
                "microphone_stopped" => {
                    debug!("Microphone activity stopped");

                    let event = MeetingDetectionEvent {
                        event_type: MeetingEventType::MicActivityStopped,
                        app_bundle_id: "system".to_string(),
                        app_name: "System Microphone".to_string(),
                        timestamp: Utc::now(),
                        metadata: HashMap::new(),
                    };

                    if let Err(e) = callback_sender.send(event) {
                        error!("Failed to send microphone stopped event: {}", e);
                    }
                }
                _ => {}
            });

            mic_detector.start(mic_callback);

            // The existing mic detector already handles real-time detection
            // No need for additional polling or shell commands
            while is_running.load(std::sync::atomic::Ordering::SeqCst) {
                sleep(TokioDuration::from_secs(1)).await;
            }

            mic_detector.stop();
        });

        self.detection_handles.push(handle);
        Ok(())
    }

    fn start_scheduled_detection(&mut self) -> Result<()> {
        info!("Starting scheduled meeting detection");

        let event_sender = self.event_sender.clone();
        let is_running = self.is_running.clone();
        let pre_meeting_minutes = self.config.pre_meeting_notification_minutes;
        let app_handle = self.app_handle.clone();

        let handle = tokio::spawn(async move {
            while is_running.load(std::sync::atomic::Ordering::SeqCst) {
                // Check for upcoming meetings and send notifications
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
                                debug!(
                                    "Meeting '{}' starts in {} minutes",
                                    event.title, minutes_until
                                );

                                let detection_event = MeetingDetectionEvent {
                                    event_type: MeetingEventType::ScheduledMeetingStarting,
                                    app_bundle_id: "calendar".to_string(),
                                    app_name: "Calendar".to_string(),
                                    timestamp: now,
                                    metadata: {
                                        let mut metadata = HashMap::new();
                                        metadata.insert("event_id".to_string(), event.id.clone());
                                        metadata
                                            .insert("event_title".to_string(), event.title.clone());
                                        metadata.insert(
                                            "minutes_until".to_string(),
                                            minutes_until.to_string(),
                                        );
                                        metadata.insert(
                                            "start_time".to_string(),
                                            event.start_time.to_rfc3339(),
                                        );
                                        metadata
                                    },
                                };

                                if let Err(e) = event_sender.send(detection_event) {
                                    error!("Failed to send scheduled meeting event: {}", e);
                                }
                            }
                        }
                    }
                    Err(e) => {
                        error!("Error getting upcoming events: {}", e);
                    }
                }
                sleep(TokioDuration::from_secs(30)).await;
            }
        });

        self.detection_handles.push(handle);
        Ok(())
    }

    fn start_window_detection(&mut self) -> Result<()> {
        info!("Starting window focus detection");

        let event_sender = self.event_sender.clone();
        let supported_apps = self.config.supported_apps.clone();
        let is_running = self.is_running.clone();

        let handle = tokio::spawn(async move {
            while is_running.load(std::sync::atomic::Ordering::SeqCst) {
                if let Ok(focused_app) = Self::get_focused_app().await {
                    if supported_apps.contains(&focused_app) {
                        let event = MeetingDetectionEvent {
                            event_type: MeetingEventType::WindowFocused,
                            app_bundle_id: focused_app.clone(),
                            app_name: Self::get_app_name_from_bundle_id(&focused_app),
                            timestamp: Utc::now(),
                            metadata: HashMap::new(),
                        };

                        if let Err(e) = event_sender.send(event) {
                            error!("Failed to send window focus event: {}", e);
                        }
                    }
                }
                sleep(TokioDuration::from_secs(1)).await;
            }
        });

        self.detection_handles.push(handle);
        Ok(())
    }

    async fn get_upcoming_events_from_db(
        app_handle: &tauri::AppHandle<R>,
        now: DateTime<Utc>,
        minutes_ahead: i64,
    ) -> Result<Vec<ScheduledEvent>> {
        let end_time = now + Duration::minutes(minutes_ahead);

        // Get database connection
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

        // Query events from database
        match get_events_in_range(&db, now, end_time).await {
            Ok(db_events) => {
                let mut events = Vec::new();

                for db_event in db_events {
                    // Convert database event to ScheduledEvent
                    events.push(ScheduledEvent {
                        id: db_event.id,
                        title: db_event.title,
                        start_time: db_event.start_date,
                        end_time: db_event.end_date,
                        description: Some(db_event.note),
                        location: None,    // Database doesn't store location currently
                        attendees: vec![], // Could be extracted from participants if needed
                    });
                }

                // Sort events by start time
                events.sort_by(|a, b| a.start_time.cmp(&b.start_time));

                debug!("Returning {} upcoming events from database", events.len());
                Ok(events)
            }
            Err(e) => {
                error!("Failed to get events from database: {}", e);
                Ok(vec![]) // Return empty vec instead of failing
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

    fn get_app_name_from_bundle_id(bundle_id: &str) -> String {
        match bundle_id {
            "us.zoom.xos" => "Zoom".to_string(),
            "Cisco-Systems.Spark" => "Cisco Webex".to_string(),
            "com.microsoft.teams" => "Microsoft Teams".to_string(),
            "com.microsoft.teams2" => "Microsoft Teams (New)".to_string(),
            "com.google.Chrome" => "Google Chrome".to_string(),
            "com.apple.Safari" => "Safari".to_string(),
            "com.microsoft.VSCode" => "Visual Studio Code".to_string(),
            "com.skype.skype" => "Skype".to_string(),
            "com.google.Chrome.app.kjgfgldnnfoeklkmfkjfagphfepbbdan" => "Google Meet".to_string(),
            "com.apple.FaceTime" => "FaceTime".to_string(),
            "com.discord.Discord" => "Discord".to_string(),
            "com.slack.Slack" => "Slack".to_string(),
            "com.facebook.Messenger" => "Facebook Messenger".to_string(),
            "com.whatsapp.WhatsApp" => "WhatsApp".to_string(),
            "com.gotomeeting.GoToMeeting" => "GoToMeeting".to_string(),
            "com.logmein.GoToWebinar" => "GoToWebinar".to_string(),
            "com.ringcentral.RingCentral" => "RingCentral".to_string(),
            "com.bluejeans.bluejeans" => "BlueJeans".to_string(),
            "com.8x8.meet" => "8x8 Meet".to_string(),
            "com.jitsi.meet" => "Jitsi Meet".to_string(),
            _ => bundle_id.to_string(),
        }
    }

    pub fn simulate_mic_activity(&self) -> Result<()> {
        if !self.is_running() {
            return Err(crate::Error::AutomationNotRunning);
        }

        let event = MeetingDetectionEvent {
            event_type: MeetingEventType::MicActivityDetected,
            app_bundle_id: "system".to_string(),
            app_name: "System Microphone".to_string(),
            timestamp: Utc::now(),
            metadata: HashMap::new(),
        };

        self.event_sender
            .send(event)
            .map_err(|e| crate::Error::DetectionError(e.to_string()))?;

        Ok(())
    }

    pub fn simulate_app_termination(&self, bundle_id: String) -> Result<()> {
        if !self.is_running() {
            return Err(crate::Error::AutomationNotRunning);
        }

        let app_name = Self::get_app_name_from_bundle_id(&bundle_id);
        let event = MeetingDetectionEvent {
            event_type: MeetingEventType::AppTerminated,
            app_bundle_id: bundle_id,
            app_name,
            timestamp: Utc::now(),
            metadata: HashMap::new(),
        };

        self.event_sender
            .send(event)
            .map_err(|e| crate::Error::DetectionError(e.to_string()))?;

        Ok(())
    }
}

#[derive(Debug, Clone)]
pub struct ScheduledEvent {
    pub id: String,
    pub title: String,
    pub start_time: DateTime<Utc>,
    pub end_time: DateTime<Utc>,
    pub description: Option<String>,
    pub location: Option<String>,
    pub attendees: Vec<String>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::NotificationSettings;
    use tokio::time::{timeout, Duration as TokioDuration};

    fn create_test_config() -> AutomationConfig {
        AutomationConfig {
            enabled: true,
            auto_start_on_app_detection: true,
            auto_start_on_mic_activity: true,
            auto_stop_on_app_exit: true,
            auto_start_scheduled_meetings: true,
            require_window_focus: false,
            pre_meeting_notification_minutes: 5,
            supported_apps: vec!["us.zoom.xos".to_string(), "com.microsoft.teams".to_string()],
            notification_settings: NotificationSettings::default(),
        }
    }

    #[tokio::test]
    async fn test_detector_creation() {
        let config = create_test_config();
        let result = UnifiedDetector::new(config);

        assert!(result.is_ok());
        let (detector, _receiver) = result.unwrap();
        assert!(!detector.is_running());
    }

    #[tokio::test]
    async fn test_detector_start_stop() {
        let config = create_test_config();
        let (mut detector, _receiver) = UnifiedDetector::new(config).unwrap();

        let start_result = detector.start();
        assert!(start_result.is_ok());
        assert!(detector.is_running());

        let stop_result = detector.stop();
        assert!(stop_result.is_ok());
        assert!(!detector.is_running());
    }

    #[tokio::test]
    async fn test_simulate_mic_activity() {
        let config = create_test_config();
        let (mut detector, mut receiver) = UnifiedDetector::new(config).unwrap();

        detector.start().unwrap();

        detector.simulate_mic_activity().unwrap();

        let event = timeout(TokioDuration::from_secs(1), receiver.recv()).await;
        assert!(event.is_ok());

        let event = event.unwrap().unwrap();
        assert!(matches!(
            event.event_type,
            MeetingEventType::MicActivityDetected
        ));
        assert_eq!(event.app_name, "System Microphone");

        detector.stop().ok();
    }

    #[tokio::test]
    async fn test_app_name_mapping() {
        assert_eq!(
            UnifiedDetector::get_app_name_from_bundle_id("us.zoom.xos"),
            "Zoom"
        );
        assert_eq!(
            UnifiedDetector::get_app_name_from_bundle_id("com.microsoft.teams"),
            "Microsoft Teams"
        );
        assert_eq!(
            UnifiedDetector::get_app_name_from_bundle_id("unknown.app"),
            "unknown.app"
        );
    }
}
