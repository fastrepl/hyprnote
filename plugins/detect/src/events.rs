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
        #[serde(rename = "micProlongedUsage")]
        MicProlongedUsage {
            key: String,
            app: hypr_detect::InstalledApp,
            duration_secs: u64,
        },
    }
}
