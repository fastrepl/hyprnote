use serde::{Deserialize, Serialize};
use specta::Type;
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct AutomationConfig {
    pub enabled: bool,
    pub auto_start_on_app_detection: bool,
    pub auto_start_on_mic_activity: bool,
    pub auto_stop_on_app_exit: bool,
    pub auto_start_scheduled_meetings: bool,
    pub require_window_focus: bool,
    pub pre_meeting_notification_minutes: u32,
    pub supported_apps: Vec<String>,
    pub notification_settings: NotificationSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct NotificationSettings {
    pub show_meeting_started: bool,
    pub show_meeting_ending: bool,
    pub show_pre_meeting_reminder: bool,
    pub show_recording_started: bool,
    pub show_recording_stopped: bool,
}

impl Default for AutomationConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            auto_start_on_app_detection: true,
            auto_start_on_mic_activity: false,
            auto_stop_on_app_exit: true,
            auto_start_scheduled_meetings: true,
            require_window_focus: false,
            pre_meeting_notification_minutes: 5,
            supported_apps: vec![
                "us.zoom.xos".to_string(),
                "Cisco-Systems.Spark".to_string(),
                "com.microsoft.teams".to_string(),
                "com.google.Chrome".to_string(),
                "com.apple.Safari".to_string(),
                "com.microsoft.VSCode".to_string(),
            ],
            notification_settings: NotificationSettings::default(),
        }
    }
}

impl Default for NotificationSettings {
    fn default() -> Self {
        Self {
            show_meeting_started: true,
            show_meeting_ending: true,
            show_pre_meeting_reminder: true,
            show_recording_started: true,
            show_recording_stopped: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct MeetingDetectionEvent {
    pub event_type: MeetingEventType,
    pub app_bundle_id: String,
    pub app_name: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub metadata: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub enum MeetingEventType {
    AppLaunched,
    AppTerminated,
    MicActivityDetected,
    MicActivityStopped,
    ScheduledMeetingStarting,
    ScheduledMeetingEnding,
    WindowFocused,
    WindowUnfocused,
}
