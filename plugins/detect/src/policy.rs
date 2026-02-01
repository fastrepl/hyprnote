use std::collections::{BTreeSet, HashMap};
use std::sync::Mutex;
use std::time::{Duration, Instant};

use hypr_notification_interface::NotificationKey;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MicEventType {
    Started,
    Stopped,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SkipReason {
    HyprnoteListening,
    DoNotDisturb,
    AllAppsFiltered,
    RecentlyNotified { key: String, ago: Duration },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AppCategory {
    Hyprnote,
    Dictation,
    IDE,
    ScreenRecording,
    AIAssistant,
    Other,
}

impl AppCategory {
    pub fn bundle_ids(&self) -> &'static [&'static str] {
        match self {
            Self::Hyprnote => &[
                "com.hyprnote.dev",
                "com.hyprnote.stable",
                "com.hyprnote.nightly",
                "com.hyprnote.staging",
            ],
            Self::Dictation => &[
                "com.electron.wispr-flow",
                "com.seewillow.WillowMac",
                "com.superduper.superwhisper",
                "com.prakashjoshipax.VoiceInk",
                "com.goodsnooze.macwhisper",
                "com.descript.beachcube",
                "com.apple.VoiceMemos",
                "com.electron.aqua-voice",
            ],
            Self::IDE => &[
                "dev.warp.Warp-Stable",
                "com.exafunction.windsurf",
                "com.microsoft.VSCode",
                "com.todesktop.230313mzl4w4u92",
            ],
            Self::ScreenRecording => &[
                "so.cap.desktop",
                "com.timpler.screenstudio",
                "com.loom.desktop",
                "com.obsproject.obs-studio",
            ],
            Self::AIAssistant => &["com.openai.chat", "com.anthropic.claudefordesktop"],
            Self::Other => &[
                "com.raycast.macos",
                "com.apple.garageband10",
                "com.apple.Sound-Settings.extension",
            ],
        }
    }

    pub fn all() -> &'static [AppCategory] {
        &[
            Self::Hyprnote,
            Self::Dictation,
            Self::IDE,
            Self::ScreenRecording,
            Self::AIAssistant,
            Self::Other,
        ]
    }

    pub fn find_category(bundle_id: &str) -> Option<AppCategory> {
        for category in Self::all() {
            if category.bundle_ids().contains(&bundle_id) {
                return Some(*category);
            }
        }
        None
    }
}

pub fn default_ignored_bundle_ids() -> Vec<String> {
    AppCategory::all()
        .iter()
        .flat_map(|cat| cat.bundle_ids().iter().map(|s| s.to_string()))
        .collect()
}

pub struct RecentNotifications {
    inner: Mutex<HashMap<String, Instant>>,
    dedupe_window: Duration,
}

impl RecentNotifications {
    pub fn new(dedupe_window: Duration) -> Self {
        Self {
            inner: Mutex::new(HashMap::new()),
            dedupe_window,
        }
    }

    pub fn check_and_record(&self, key: &NotificationKey) -> Option<Duration> {
        let dedup_key = key.to_dedup_key();
        let mut map = self.inner.lock().unwrap();
        let now = Instant::now();

        map.retain(|_, timestamp| now.duration_since(*timestamp) < self.dedupe_window);

        if let Some(&last_shown) = map.get(&dedup_key) {
            let ago = now.duration_since(last_shown);
            if ago < self.dedupe_window {
                return Some(ago);
            }
        }

        map.insert(dedup_key, now);
        None
    }
}

impl Default for RecentNotifications {
    fn default() -> Self {
        Self::new(Duration::from_secs(60 * 5))
    }
}

pub struct PolicyContext<'a> {
    pub apps: &'a [hypr_detect::InstalledApp],
    pub is_listening: bool,
    pub is_dnd: bool,
    pub event_type: MicEventType,
}

pub struct PolicyResult {
    pub filtered_apps: Vec<hypr_detect::InstalledApp>,
    pub dedup_key: String,
}

pub struct MicNotificationPolicy {
    pub skip_when_listening: bool,
    pub respect_dnd: bool,
    pub ignored_categories: Vec<AppCategory>,
    pub user_ignored_bundle_ids: Vec<String>,
    pub recent_notifications: RecentNotifications,
}

impl MicNotificationPolicy {
    pub fn evaluate(&self, ctx: &PolicyContext) -> Result<PolicyResult, SkipReason> {
        if self.skip_when_listening && ctx.is_listening {
            return Err(SkipReason::HyprnoteListening);
        }

        if self.respect_dnd && ctx.is_dnd {
            return Err(SkipReason::DoNotDisturb);
        }

        let ignored_from_categories: BTreeSet<&str> = self
            .ignored_categories
            .iter()
            .flat_map(|cat| cat.bundle_ids().iter().copied())
            .collect();

        let filtered_apps: Vec<_> = ctx
            .apps
            .iter()
            .filter(|app| {
                if self.user_ignored_bundle_ids.contains(&app.id) {
                    return false;
                }
                if ignored_from_categories.contains(app.id.as_str()) {
                    return false;
                }
                true
            })
            .cloned()
            .collect();

        if filtered_apps.is_empty() {
            return Err(SkipReason::AllAppsFiltered);
        }

        let notification_key = match ctx.event_type {
            MicEventType::Started => {
                NotificationKey::mic_started(filtered_apps.iter().map(|a| a.id.clone()))
            }
            MicEventType::Stopped => {
                NotificationKey::mic_stopped(filtered_apps.iter().map(|a| a.id.clone()))
            }
        };

        if let Some(ago) = self
            .recent_notifications
            .check_and_record(&notification_key)
        {
            return Err(SkipReason::RecentlyNotified {
                key: notification_key.to_dedup_key(),
                ago,
            });
        }

        Ok(PolicyResult {
            filtered_apps,
            dedup_key: notification_key.to_dedup_key(),
        })
    }
}

impl Default for MicNotificationPolicy {
    fn default() -> Self {
        Self {
            skip_when_listening: true,
            respect_dnd: false,
            ignored_categories: AppCategory::all().to_vec(),
            user_ignored_bundle_ids: Vec::new(),
            recent_notifications: RecentNotifications::default(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_notification_key_dedup() {
        let key1 = NotificationKey::mic_started(["com.zoom.us".to_string()]);
        let key2 = NotificationKey::mic_started(["com.zoom.us".to_string()]);
        assert_eq!(key1.to_dedup_key(), key2.to_dedup_key());

        let key3 = NotificationKey::mic_started([
            "com.zoom.us".to_string(),
            "com.slack.Slack".to_string(),
        ]);
        let key4 = NotificationKey::mic_started([
            "com.slack.Slack".to_string(),
            "com.zoom.us".to_string(),
        ]);
        assert_eq!(key3.to_dedup_key(), key4.to_dedup_key());
    }

    #[test]
    fn test_app_category_find() {
        assert_eq!(
            AppCategory::find_category("com.hyprnote.dev"),
            Some(AppCategory::Hyprnote)
        );
        assert_eq!(AppCategory::find_category("com.zoom.us"), None);
    }

    #[test]
    fn test_recent_notifications_dedup() {
        let recent = RecentNotifications::new(Duration::from_secs(60));
        let key = NotificationKey::mic_started(["com.zoom.us".to_string()]);

        assert!(recent.check_and_record(&key).is_none());
        assert!(recent.check_and_record(&key).is_some());

        let different_key = NotificationKey::mic_started(["com.slack.Slack".to_string()]);
        assert!(recent.check_and_record(&different_key).is_none());
    }

    #[test]
    fn test_skip_when_listening() {
        let policy = MicNotificationPolicy {
            skip_when_listening: true,
            ignored_categories: vec![],
            ..Default::default()
        };

        let apps = vec![hypr_detect::InstalledApp {
            id: "com.zoom.us".to_string(),
            name: "Zoom".to_string(),
        }];

        let ctx = PolicyContext {
            apps: &apps,
            is_listening: true,
            is_dnd: false,
            event_type: MicEventType::Started,
        };

        assert!(matches!(
            policy.evaluate(&ctx),
            Err(SkipReason::HyprnoteListening)
        ));

        let ctx_not_listening = PolicyContext {
            apps: &apps,
            is_listening: false,
            is_dnd: false,
            event_type: MicEventType::Started,
        };

        assert!(policy.evaluate(&ctx_not_listening).is_ok());
    }

    #[test]
    fn test_skip_when_listening_disabled() {
        let policy = MicNotificationPolicy {
            skip_when_listening: false,
            ignored_categories: vec![],
            ..Default::default()
        };

        let apps = vec![hypr_detect::InstalledApp {
            id: "com.zoom.us".to_string(),
            name: "Zoom".to_string(),
        }];

        let ctx = PolicyContext {
            apps: &apps,
            is_listening: true,
            is_dnd: false,
            event_type: MicEventType::Started,
        };

        assert!(policy.evaluate(&ctx).is_ok());
    }
}
