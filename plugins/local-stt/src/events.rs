#[macro_export]
macro_rules! common_event_derives {
    ($item:item) => {
        #[derive(serde::Serialize, Clone, specta::Type, tauri_specta::Event)]
        $item
    };
}

common_event_derives! {
    #[serde(tag = "type")]
    pub enum RecordedProcessingEvent {
        #[serde(rename = "inactive")]
        Progress { current: usize, total: usize },
    }
}
