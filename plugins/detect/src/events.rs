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
        MicStarted { apps: Vec<hypr_detect::InstalledApp> },
        #[serde(rename = "micStopped")]
        MicStopped {},
    }
}

impl From<hypr_detect::DetectEvent> for DetectEvent {
    fn from(event: hypr_detect::DetectEvent) -> Self {
        match event {
            hypr_detect::DetectEvent::MicStarted(apps) => Self::MicStarted { apps },
            hypr_detect::DetectEvent::MicStopped => Self::MicStopped {},
        }
    }
}
