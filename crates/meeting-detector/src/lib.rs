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

pub type MeetingCallback = Arc<dyn Fn(MeetingEvent) + Send + Sync + 'static>;

fn get_known_meeting_apps() -> Vec<MeetingApp> {
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

pub struct MeetingDetector {
    active_meetings: Arc<RwLock<HashMap<String, MeetingDetected>>>,
    scheduled_meetings: Arc<RwLock<Vec<ScheduledMeeting>>>,
    callbacks: Arc<RwLock<Vec<MeetingCallback>>>,
    stop_signal: Option<mpsc::Sender<()>>,
    notified_meetings: Arc<RwLock<HashMap<String, DateTime<Utc>>>>,
    started_meetings: Arc<RwLock<HashMap<String, DateTime<Utc>>>>,
}

impl Clone for MeetingDetector {
    fn clone(&self) -> Self {
        Self {
            active_meetings: Arc::clone(&self.active_meetings),
            scheduled_meetings: Arc::clone(&self.scheduled_meetings),
            callbacks: Arc::clone(&self.callbacks),
            stop_signal: self.stop_signal.clone(),
            notified_meetings: Arc::clone(&self.notified_meetings),
            started_meetings: Arc::clone(&self.started_meetings),
        }
    }
}

impl Default for MeetingDetector {
    fn default() -> Self {
        Self::new()
    }
}

impl MeetingDetector {
    pub fn new() -> Self {
        Self {
            active_meetings: Arc::new(RwLock::new(HashMap::new())),
            scheduled_meetings: Arc::new(RwLock::new(Vec::new())),
            callbacks: Arc::new(RwLock::new(Vec::new())),
            stop_signal: None,
            notified_meetings: Arc::new(RwLock::new(HashMap::new())),
            started_meetings: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn add_callback(&self, callback: MeetingCallback) {
        let mut callbacks = self.callbacks.write().await;
        callbacks.push(callback);
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
        self.stop_signal = Some(stop_tx);

        let active_meetings = self.active_meetings.clone();
        let callbacks = self.callbacks.clone();

        tokio::spawn(async move {
            let mut interval = tokio::time::interval(std::time::Duration::from_secs(5));

            loop {
                tokio::select! {
                    _ = interval.tick() => {
                        #[cfg(target_os = "macos")]
                        {
                            if let Err(e) = Self::check_running_apps_macos(&active_meetings, &callbacks).await {
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

        self.start_scheduled_monitoring(minutes_before_notification.unwrap_or(5))
            .await;
        Ok(())
    }

    pub async fn stop_detection(&mut self) {
        if let Some(stop_tx) = self.stop_signal.take() {
            let _ = stop_tx.send(()).await;
        }
    }

    #[cfg(target_os = "macos")]
    async fn check_running_apps_macos(
        active_meetings: &Arc<RwLock<HashMap<String, MeetingDetected>>>,
        callbacks: &Arc<RwLock<Vec<MeetingCallback>>>,
    ) -> Result<(), anyhow::Error> {
        let known_apps = get_known_meeting_apps();
        let mut current_meeting_apps = Vec::new();

        for meeting_app in &known_apps {
            if Self::is_app_running(&meeting_app.bundle_id) {
                let window_title = Self::get_active_window_title(&meeting_app.bundle_id).await;
                let confidence = Self::calculate_meeting_confidence(meeting_app, &window_title);

                // Use a reasonable minimum threshold for detection (0.5)
                // The actual recording decision will use the user's configured threshold
                if confidence > 0.5 {
                    current_meeting_apps.push(meeting_app.clone());

                    let meeting_detected = MeetingDetected {
                        app: meeting_app.clone(),
                        window_title: window_title.clone(),
                        detected_at: Utc::now(),
                        confidence,
                    };

                    let mut active = active_meetings.write().await;
                    if !active.contains_key(&meeting_app.bundle_id) {
                        active.insert(meeting_app.bundle_id.clone(), meeting_detected.clone());

                        let callbacks_guard = callbacks.read().await;
                        for callback in callbacks_guard.iter() {
                            callback(MeetingEvent::AdHocMeetingDetected(meeting_detected.clone()));
                        }
                    }
                }
            }
        }

        let mut active = active_meetings.write().await;
        let mut to_remove = Vec::new();

        for (bundle_id, _) in active.iter() {
            if !current_meeting_apps
                .iter()
                .any(|app| &app.bundle_id == bundle_id)
            {
                to_remove.push(bundle_id.clone());
            }
        }

        for bundle_id in to_remove {
            active.remove(&bundle_id);
            let callbacks_guard = callbacks.read().await;
            for callback in callbacks_guard.iter() {
                callback(MeetingEvent::MeetingAppClosed(bundle_id.clone()));
            }
        }

        Ok(())
    }

    #[cfg(target_os = "macos")]
    fn is_app_running(bundle_id: &str) -> bool {
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

        if let Ok(output) = output {
            let result_str = String::from_utf8_lossy(&output.stdout);
            let result = result_str.trim();
            result == "true"
        } else {
            false
        }
    }

    #[cfg(target_os = "macos")]
    async fn get_active_window_title(bundle_id: &str) -> Option<String> {
        let bundle_id = bundle_id.to_string();

        tokio::task::spawn_blocking(move || {
            use std::process::Command;

            let script = format!(
                r#"
                tell application "System Events"
                    set appName to name of application process whose bundle identifier is "{}"
                    if exists appName then
                        try
                            set frontmostApp to name of first application process whose frontmost is true
                            if frontmostApp = appName then
                                return name of front window of application process appName
                            else
                                return name of front window of application process appName
                            end if
                        on error
                            return ""
                        end try
                    else
                        return ""
                    end if
                end tell
                "#,
                bundle_id
            );

            let output = Command::new("osascript").arg("-e").arg(&script).output();

            if let Ok(output) = output {
                let title = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !title.is_empty() && title != "missing value" {
                    Some(title)
                } else {
                    None
                }
            } else {
                None
            }
        }).await.unwrap_or(None)
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

    async fn start_scheduled_monitoring(&self, minutes_before_notification: u32) {
        let scheduled_meetings = self.scheduled_meetings.clone();
        let callbacks = self.callbacks.clone();
        let notified_meetings = self.notified_meetings.clone();
        let started_meetings = self.started_meetings.clone();

        tokio::spawn(async move {
            let mut interval = tokio::time::interval(std::time::Duration::from_secs(30));

            loop {
                interval.tick().await;

                let meetings = scheduled_meetings.read().await;
                let now = Utc::now();

                for meeting in meetings.iter() {
                    let time_until_start = meeting.start_time.signed_duration_since(now);
                    let time_since_start = now.signed_duration_since(meeting.start_time);
                    let time_since_end = now.signed_duration_since(meeting.end_time);

                    // Pre-meeting notification (configurable, default 5 minutes)
                    if time_until_start.num_minutes() <= minutes_before_notification as i64
                        && time_until_start.num_minutes()
                            >= (minutes_before_notification as i64 - 1)
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
