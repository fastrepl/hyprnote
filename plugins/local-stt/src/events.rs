#[macro_export]
macro_rules! common_event_derives {
    ($item:item) => {
        #[derive(Debug, Clone, serde::Serialize, specta::Type, tauri_specta::Event)]
        $item
    };
}

common_event_derives! {
    #[serde(tag = "type")]
    pub enum RecordedProcessingEvent {
        #[serde(rename = "progress")]
        Progress { current: usize, total: usize, word: hypr_listener_interface::Word },
    }
}
