use serde::{Deserialize, Serialize};
use specta::Type;
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SupportedApp {
    pub bundle_id: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct AutomationConfig {
    pub enabled: bool,
    pub auto_start_on_app_detection: bool,
    pub auto_start_on_mic_activity: bool,
    pub auto_stop_on_app_exit: bool,
    pub auto_start_scheduled_meetings: bool,
    pub require_window_focus: bool,
    pub pre_meeting_notification_minutes: u32,
    pub supported_apps: Vec<SupportedApp>,
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
            supported_apps: Self::default_supported_apps(),
            notification_settings: NotificationSettings::default(),
        }
    }
}

impl AutomationConfig {
    pub fn default_supported_apps() -> Vec<SupportedApp> {
        vec![
            SupportedApp {
                bundle_id: "us.zoom.xos".to_string(),
                name: "Zoom".to_string(),
            },
            SupportedApp {
                bundle_id: "Cisco-Systems.Spark".to_string(),
                name: "Cisco Webex".to_string(),
            },
            SupportedApp {
                bundle_id: "com.microsoft.teams".to_string(),
                name: "Microsoft Teams".to_string(),
            },
            SupportedApp {
                bundle_id: "com.microsoft.teams2".to_string(),
                name: "Microsoft Teams (New)".to_string(),
            },
            SupportedApp {
                bundle_id: "com.google.Chrome".to_string(),
                name: "Google Chrome".to_string(),
            },
            SupportedApp {
                bundle_id: "com.apple.Safari".to_string(),
                name: "Safari".to_string(),
            },
            SupportedApp {
                bundle_id: "com.microsoft.VSCode".to_string(),
                name: "Visual Studio Code".to_string(),
            },
            SupportedApp {
                bundle_id: "com.skype.skype".to_string(),
                name: "Skype".to_string(),
            },
            SupportedApp {
                bundle_id: "com.google.Chrome.app.kjgfgldnnfoeklkmfkjfagphfepbbdan".to_string(),
                name: "Google Meet".to_string(),
            },
            SupportedApp {
                bundle_id: "com.apple.FaceTime".to_string(),
                name: "FaceTime".to_string(),
            },
            SupportedApp {
                bundle_id: "com.discord.Discord".to_string(),
                name: "Discord".to_string(),
            },
            SupportedApp {
                bundle_id: "com.slack.Slack".to_string(),
                name: "Slack".to_string(),
            },
            SupportedApp {
                bundle_id: "com.facebook.Messenger".to_string(),
                name: "Facebook Messenger".to_string(),
            },
            SupportedApp {
                bundle_id: "com.whatsapp.WhatsApp".to_string(),
                name: "WhatsApp".to_string(),
            },
            SupportedApp {
                bundle_id: "com.gotomeeting.GoToMeeting".to_string(),
                name: "GoToMeeting".to_string(),
            },
            SupportedApp {
                bundle_id: "com.logmein.GoToWebinar".to_string(),
                name: "GoToWebinar".to_string(),
            },
            SupportedApp {
                bundle_id: "com.ringcentral.RingCentral".to_string(),
                name: "RingCentral".to_string(),
            },
            SupportedApp {
                bundle_id: "com.bluejeans.bluejeans".to_string(),
                name: "BlueJeans".to_string(),
            },
            SupportedApp {
                bundle_id: "com.8x8.meet".to_string(),
                name: "8x8 Meet".to_string(),
            },
            SupportedApp {
                bundle_id: "com.jitsi.meet".to_string(),
                name: "Jitsi Meet".to_string(),
            },
        ]
    }

    pub fn get_app_name(&self, bundle_id: &str) -> String {
        self.supported_apps
            .iter()
            .find(|app| app.bundle_id == bundle_id)
            .map(|app| app.name.clone())
            .unwrap_or_else(|| bundle_id.to_string())
    }

    pub fn is_supported_app(&self, bundle_id: &str) -> bool {
        self.supported_apps
            .iter()
            .any(|app| app.bundle_id == bundle_id)
    }

    pub fn supported_bundle_ids(&self) -> Vec<&str> {
        self.supported_apps
            .iter()
            .map(|app| app.bundle_id.as_str())
            .collect()
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
