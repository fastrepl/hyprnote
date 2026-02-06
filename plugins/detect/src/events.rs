#[macro_export]
macro_rules! common_event_derives {
    ($item:item) => {
        #[derive(serde::Serialize, Clone, specta::Type, tauri_specta::Event)]
        $item
    };
}

common_event_derives! {
    #[serde(tag = "type")]
    pub enum DetectEvent {
        #[serde(rename = "micStarted")]
        MicStarted {
            key: String,
            apps: Vec<hypr_detect::InstalledApp>,
        },
        #[serde(rename = "micStopped")]
        MicStopped {
            apps: Vec<hypr_detect::InstalledApp>,
        },
        #[serde(rename = "micMuted")]
        MicMuteStateChanged { value: bool },
        #[serde(rename = "sleepStateChanged")]
        SleepStateChanged { value: bool },
        #[serde(rename = "micActiveWithoutHyprnote")]
        MicActiveWithoutHyprnote {
            key: String,
            app: hypr_detect::InstalledApp,
            duration_secs: u64,
        },
    }
}

impl From<hypr_detect::DetectEvent> for DetectEvent {
    fn from(event: hypr_detect::DetectEvent) -> Self {
        match event {
            hypr_detect::DetectEvent::MicStarted(apps) => Self::MicStarted {
                key: uuid::Uuid::new_v4().to_string(),
                apps,
            },
            hypr_detect::DetectEvent::MicStopped(apps) => Self::MicStopped { apps },
            #[cfg(all(target_os = "macos", feature = "zoom"))]
            hypr_detect::DetectEvent::ZoomMuteStateChanged { value } => {
                Self::MicMuteStateChanged { value }
            }
            #[cfg(all(target_os = "macos", feature = "sleep"))]
            hypr_detect::DetectEvent::SleepStateChanged { value } => {
                Self::SleepStateChanged { value }
            }
        }
    }
}
