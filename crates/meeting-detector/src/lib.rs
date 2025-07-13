use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use specta::Type;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{mpsc, RwLock};

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct MeetingApp {
    pub name: String,
    pub bundle_id: String,
    pub window_patterns: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct MeetingDetected {
    pub app: MeetingApp,
    pub window_title: Option<String>,
    pub detected_at: DateTime<Utc>,
    pub confidence: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ScheduledMeeting {
    pub id: String,
    pub title: String,
    pub start_time: DateTime<Utc>,
    pub end_time: DateTime<Utc>,
    pub participants: Vec<String>,
    pub is_upcoming: bool,
}

#[derive(Debug, Clone)]
pub enum MeetingEvent {
    AdHocMeetingDetected(MeetingDetected),
    ScheduledMeetingUpcoming(ScheduledMeeting),
    ScheduledMeetingStarting(ScheduledMeeting),
    ScheduledMeetingEnded(ScheduledMeeting),
    MeetingAppClosed(String),
}

#[derive(Debug, Clone)]
pub enum DetectionError {
    AppleScriptFailed { bundle_id: String, error: String },
    SystemError(String),
}

pub type MeetingCallback = Arc<dyn Fn(MeetingEvent) + Send + Sync + 'static>;
pub type ErrorCallback = Arc<dyn Fn(DetectionError) + Send + Sync + 'static>;

pub fn get_known_meeting_apps() -> Vec<MeetingApp> {
    vec![
        MeetingApp {
            name: "Zoom".to_string(),
            bundle_id: "us.zoom.xos".to_string(),
            window_patterns: vec![
                "Zoom Meeting".to_string(),
                "Zoom Webinar".to_string(),
                "Zoom Call".to_string(),
                "Personal Meeting Room".to_string(),
            ],
        },
        MeetingApp {
            name: "Google Meet".to_string(),
            bundle_id: "com.google.Chrome".to_string(),
            window_patterns: vec![
                "Meet - ".to_string(),
                "Google Meet".to_string(),
                "meet.google.com".to_string(),
            ],
        },
        MeetingApp {
            name: "Microsoft Teams".to_string(),
            bundle_id: "com.microsoft.teams".to_string(),
            window_patterns: vec![
                "Microsoft Teams".to_string(),
                "Teams Meeting".to_string(),
                "Teams Call".to_string(),
            ],
        },
        MeetingApp {
            name: "Slack".to_string(),
            bundle_id: "com.tinyspeck.slackmacgap".to_string(),
            window_patterns: vec![
                "Slack Call".to_string(),
                "Huddle".to_string(),
                "Voice call".to_string(),
            ],
        },
        MeetingApp {
            name: "Discord".to_string(),
            bundle_id: "com.hnc.Discord".to_string(),
            window_patterns: vec!["Discord".to_string(), "Voice Connected".to_string()],
        },
        MeetingApp {
            name: "FaceTime".to_string(),
            bundle_id: "com.apple.FaceTime".to_string(),
            window_patterns: vec!["FaceTime".to_string()],
        },
        MeetingApp {
            name: "Webex".to_string(),
            bundle_id: "com.cisco.webexmeetingsapp".to_string(),
            window_patterns: vec!["Cisco Webex Meeting".to_string(), "Webex".to_string()],
        },
        MeetingApp {
            name: "GoToMeeting".to_string(),
            bundle_id: "com.logmein.gotomeeting".to_string(),
            window_patterns: vec!["GoToMeeting".to_string()],
        },
        MeetingApp {
            name: "BlueJeans".to_string(),
            bundle_id: "com.bluejeans.Blue".to_string(),
            window_patterns: vec!["BlueJeans".to_string()],
        },
        MeetingApp {
            name: "Skype".to_string(),
            bundle_id: "com.skype.skype".to_string(),
            window_patterns: vec!["Skype".to_string(), "Call with".to_string()],
        },
    ]
}

pub fn get_known_meeting_app_names() -> Vec<String> {
    get_known_meeting_apps()
        .into_iter()
        .map(|app| app.name)
        .collect()
}

pub struct MeetingDetector {
    active_meetings: Arc<RwLock<HashMap<String, MeetingDetected>>>,
    scheduled_meetings: Arc<RwLock<Vec<ScheduledMeeting>>>,
    callbacks: Arc<RwLock<Vec<MeetingCallback>>>,
    error_callbacks: Arc<RwLock<Vec<ErrorCallback>>>,
    stop_signal: Option<mpsc::Sender<()>>,
    scheduled_stop_signal: Option<mpsc::Sender<()>>,
    notified_meetings: Arc<RwLock<HashMap<String, DateTime<Utc>>>>,
    started_meetings: Arc<RwLock<HashMap<String, DateTime<Utc>>>>,
    detection_threshold: f32,
}

impl Clone for MeetingDetector {
    fn clone(&self) -> Self {
        Self {
            active_meetings: Arc::clone(&self.active_meetings),
            scheduled_meetings: Arc::clone(&self.scheduled_meetings),
            callbacks: Arc::clone(&self.callbacks),
            error_callbacks: Arc::clone(&self.error_callbacks),
            stop_signal: self.stop_signal.clone(),
            scheduled_stop_signal: self.scheduled_stop_signal.clone(),
            notified_meetings: Arc::clone(&self.notified_meetings),
            started_meetings: Arc::clone(&self.started_meetings),
            detection_threshold: self.detection_threshold,
        }
    }
}

impl Default for MeetingDetector {
    fn default() -> Self {
        Self::new(0.5)
    }
}

impl MeetingDetector {
    pub fn new(detection_threshold: f32) -> Self {
        Self {
            active_meetings: Arc::new(RwLock::new(HashMap::new())),
            scheduled_meetings: Arc::new(RwLock::new(Vec::new())),
            callbacks: Arc::new(RwLock::new(Vec::new())),
            error_callbacks: Arc::new(RwLock::new(Vec::new())),
            stop_signal: None,
            scheduled_stop_signal: None,
            notified_meetings: Arc::new(RwLock::new(HashMap::new())),
            started_meetings: Arc::new(RwLock::new(HashMap::new())),
            detection_threshold,
        }
    }

    pub async fn add_callback(&self, callback: MeetingCallback) {
        let mut callbacks = self.callbacks.write().await;
        callbacks.push(callback);
    }

    pub async fn add_error_callback(&self, callback: ErrorCallback) {
        let mut error_callbacks = self.error_callbacks.write().await;
        error_callbacks.push(callback);
    }

    pub async fn set_scheduled_meetings(&self, meetings: Vec<ScheduledMeeting>) {
        let mut scheduled = self.scheduled_meetings.write().await;
        *scheduled = meetings;
    }

    pub async fn start_detection(
        &mut self,
        minutes_before_notification: Option<u32>,
    ) -> Result<(), anyhow::Error> {
        let (stop_tx, mut stop_rx) = mpsc::channel::<()>(1);
        let (scheduled_stop_tx, scheduled_stop_rx) = mpsc::channel::<()>(1);
        self.stop_signal = Some(stop_tx);
        self.scheduled_stop_signal = Some(scheduled_stop_tx);

        let active_meetings = self.active_meetings.clone();
        let callbacks = self.callbacks.clone();
        let error_callbacks = self.error_callbacks.clone();
        let detection_threshold = self.detection_threshold;

        tokio::spawn(async move {
            let mut interval = tokio::time::interval(std::time::Duration::from_secs(5));

            loop {
                tokio::select! {
                    _ = interval.tick() => {
                        #[cfg(target_os = "macos")]
                        {
                            if let Err(e) = Self::check_running_apps_macos(&active_meetings, &callbacks, &error_callbacks, detection_threshold).await {
                                tracing::error!("Error checking running apps: {}", e);
                            }
                        }
                    }
                    _ = stop_rx.recv() => {
                        break;
                    }
                }
            }
        });

        self.start_scheduled_monitoring(
            minutes_before_notification.unwrap_or(5),
            scheduled_stop_rx,
        )
        .await;
        Ok(())
    }

    pub async fn stop_detection(&mut self) {
        if let Some(stop_tx) = self.stop_signal.take() {
            let _ = stop_tx.send(()).await;
        }
        if let Some(scheduled_stop_tx) = self.scheduled_stop_signal.take() {
            let _ = scheduled_stop_tx.send(()).await;
        }
    }

    #[cfg(target_os = "macos")]
    async fn check_running_apps_macos(
        active_meetings: &Arc<RwLock<HashMap<String, MeetingDetected>>>,
        callbacks: &Arc<RwLock<Vec<MeetingCallback>>>,
        error_callbacks: &Arc<RwLock<Vec<ErrorCallback>>>,
        detection_threshold: f32,
    ) -> Result<(), anyhow::Error> {
        let known_apps = get_known_meeting_apps();
        let mut current_meeting_apps = Vec::new();
        let mut new_meetings = Vec::new();

        for meeting_app in &known_apps {
            if Self::is_app_running(&meeting_app.bundle_id, error_callbacks).await {
                let window_title =
                    Self::get_active_window_title(&meeting_app.bundle_id, error_callbacks).await;
                let confidence = Self::calculate_meeting_confidence(meeting_app, &window_title);

                if confidence > detection_threshold {
                    current_meeting_apps.push(meeting_app.clone());

                    let meeting_detected = MeetingDetected {
                        app: meeting_app.clone(),
                        window_title: window_title.clone(),
                        detected_at: Utc::now(),
                        confidence,
                    };

                    new_meetings.push((meeting_app.bundle_id.clone(), meeting_detected));
                }
            }
        }

        // Collect all changes and events that need to be triggered
        let mut events_to_trigger = Vec::new();
        let mut meetings_to_remove = Vec::new();

        // Single write lock scope for all active_meetings modifications
        {
            let mut active = active_meetings.write().await;

            // Add new meetings that don't already exist
            for (bundle_id, meeting_detected) in new_meetings {
                if !active.contains_key(&bundle_id) {
                    active.insert(bundle_id.clone(), meeting_detected.clone());
                    events_to_trigger.push(MeetingEvent::AdHocMeetingDetected(meeting_detected));
                }
            }

            // Determine which meetings to remove
            for (bundle_id, _) in active.iter() {
                if !current_meeting_apps
                    .iter()
                    .any(|app| &app.bundle_id == bundle_id)
                {
                    meetings_to_remove.push(bundle_id.clone());
                }
            }

            // Remove meetings that are no longer active
            for bundle_id in &meetings_to_remove {
                active.remove(bundle_id);
                events_to_trigger.push(MeetingEvent::MeetingAppClosed(bundle_id.clone()));
            }
        }

        // Single read lock scope for all callback invocations
        if !events_to_trigger.is_empty() {
            let callbacks_guard = callbacks.read().await;
            for event in events_to_trigger {
                for callback in callbacks_guard.iter() {
                    callback(event.clone());
                }
            }
        }

        Ok(())
    }

    #[cfg(target_os = "macos")]
    async fn is_app_running(
        bundle_id: &str,
        error_callbacks: &Arc<RwLock<Vec<ErrorCallback>>>,
    ) -> bool {
        use std::process::Command;

        let script = format!(
            r#"
            tell application "System Events"
                set appList to name of every application process
                set bundleList to bundle identifier of every application process
                repeat with i from 1 to count of bundleList
                    if item i of bundleList is "{}" then
                        return true
                    end if
                end repeat
                return false
            end tell
            "#,
            bundle_id
        );

        let output = Command::new("osascript").arg("-e").arg(&script).output();

        match output {
            Ok(output) => {
                let result_str = String::from_utf8_lossy(&output.stdout);
                let result = result_str.trim();
                result == "true"
            }
            Err(error) => {
                let detection_error = DetectionError::AppleScriptFailed {
                    bundle_id: bundle_id.to_string(),
                    error: error.to_string(),
                };

                let error_callbacks_guard = error_callbacks.read().await;
                for callback in error_callbacks_guard.iter() {
                    callback(detection_error.clone());
                }

                tracing::warn!(
                    "Failed to execute AppleScript for bundle_id {}: {}",
                    bundle_id,
                    error
                );
                false
            }
        }
    }

    #[cfg(target_os = "macos")]
    async fn get_active_window_title(
        bundle_id: &str,
        error_callbacks: &Arc<RwLock<Vec<ErrorCallback>>>,
    ) -> Option<String> {
        let bundle_id = bundle_id.to_string();
        let error_callbacks = error_callbacks.clone();

        let result = tokio::task::spawn_blocking(move || {
            use std::process::Command;

            let script = format!(
                r#"
                tell application "System Events"
                    try
                        return name of front window of application process whose bundle identifier is "{}"
                    on error
                        return ""
                    end try
                end tell
                "#,
                bundle_id
            );

            let output = Command::new("osascript").arg("-e").arg(&script).output();

            match output {
                Ok(output) => {
                    let title = String::from_utf8_lossy(&output.stdout).trim().to_string();
                    if !title.is_empty() && title != "missing value" {
                        Ok(Some(title))
                    } else {
                        Ok(None)
                    }
                }
                Err(error) => Err(DetectionError::AppleScriptFailed {
                    bundle_id: bundle_id.clone(),
                    error: error.to_string(),
                }),
            }
        })
        .await
        .unwrap_or(Ok(None));

        match result {
            Ok(title) => title,
            Err(detection_error) => {
                let error_callbacks_guard = error_callbacks.read().await;
                for callback in error_callbacks_guard.iter() {
                    callback(detection_error.clone());
                }
                None
            }
        }
    }

    fn calculate_meeting_confidence(app: &MeetingApp, window_title: &Option<String>) -> f32 {
        let mut confidence: f32 = 0.3; // Base confidence for app running

        if let Some(title) = window_title {
            // Check if window title matches meeting patterns
            for pattern in &app.window_patterns {
                if title.to_lowercase().contains(&pattern.to_lowercase()) {
                    confidence += 0.4;
                    break;
                }
            }

            // Additional heuristics based on window title content
            let title_lower = title.to_lowercase();

            // Meeting-specific keywords increase confidence
            if title_lower.contains("meeting")
                || title_lower.contains("call")
                || title_lower.contains("conference")
                || title_lower.contains("webinar")
            {
                confidence += 0.2;
            }

            // Participant indicators
            if title_lower.contains("participants")
                || title_lower.contains("attendees")
                || title_lower.contains("with")
                || title_lower.contains("@")
            {
                confidence += 0.1;
            }

            // Time/duration indicators
            if title_lower.contains("min")
                || title_lower.contains("hour")
                || title_lower.contains(":")
            {
                confidence += 0.1;
            }
        } else {
            // No window title available, but app is running
            confidence = 0.4;
        }

        confidence.min(1.0)
    }

    async fn start_scheduled_monitoring(
        &self,
        minutes_before_notification: u32,
        mut stop_rx: mpsc::Receiver<()>,
    ) {
        let scheduled_meetings = self.scheduled_meetings.clone();
        let callbacks = self.callbacks.clone();
        let notified_meetings = self.notified_meetings.clone();
        let started_meetings = self.started_meetings.clone();

        tokio::spawn(async move {
            let mut interval = tokio::time::interval(std::time::Duration::from_secs(30));

            loop {
                tokio::select! {
                    _ = interval.tick() => {
                        let meetings = scheduled_meetings.read().await;
                        let now = Utc::now();

                        for meeting in meetings.iter() {
                            let time_until_start = meeting.start_time.signed_duration_since(now);
                            let time_since_start = now.signed_duration_since(meeting.start_time);
                            let time_since_end = now.signed_duration_since(meeting.end_time);

                            // Pre-meeting notification (configurable, default 5 minutes)
                            if time_until_start.num_minutes() <= minutes_before_notification as i64
                                && time_until_start.num_seconds() >= 0
                            {
                                let mut notified = notified_meetings.write().await;
                                if !notified.contains_key(&meeting.id) {
                                    notified.insert(meeting.id.clone(), now);
                                    drop(notified); // Release lock early

                                    let callbacks_guard = callbacks.read().await;
                                    for callback in callbacks_guard.iter() {
                                        callback(MeetingEvent::ScheduledMeetingUpcoming(meeting.clone()));
                                    }
                                }
                            }

                            // Meeting start detection (within first minute)
                            if time_since_start.num_seconds() >= 0 && time_since_start.num_minutes() < 1 {
                                let mut started = started_meetings.write().await;
                                if !started.contains_key(&meeting.id) {
                                    started.insert(meeting.id.clone(), now);
                                    drop(started); // Release lock early

                                    let callbacks_guard = callbacks.read().await;
                                    for callback in callbacks_guard.iter() {
                                        callback(MeetingEvent::ScheduledMeetingStarting(meeting.clone()));
                                    }
                                }
                            }

                            // Meeting end detection
                            if time_since_end.num_seconds() >= 0 && time_since_end.num_minutes() < 1 {
                                let mut started = started_meetings.write().await;
                                if started.remove(&meeting.id).is_some() {
                                    drop(started); // Release lock early

                                    let callbacks_guard = callbacks.read().await;
                                    for callback in callbacks_guard.iter() {
                                        callback(MeetingEvent::ScheduledMeetingEnded(meeting.clone()));
                                    }
                                }
                            }

                            // Clean up old notifications (older than 1 hour)
                            if time_since_end.num_hours() >= 1 {
                                let mut notified = notified_meetings.write().await;
                                notified.remove(&meeting.id);
                                drop(notified); // Release lock early
                                
                                let mut started = started_meetings.write().await;
                                started.remove(&meeting.id);
                            }
                        }
                    }
                    _ = stop_rx.recv() => {
                        tracing::info!("Stopping scheduled meeting monitoring");
                        break;
                    }
                }
            }
        });
    }

    pub async fn get_active_meetings(&self) -> Vec<MeetingDetected> {
        let meetings = self.active_meetings.read().await;
        meetings.values().cloned().collect()
    }
}
