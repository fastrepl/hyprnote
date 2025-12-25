#[macro_export]
macro_rules! common_event_derives {
    ($item:item) => {
        #[derive(serde::Serialize, Clone, specta::Type, tauri_specta::Event)]
        $item
    };
}

common_event_derives! {
    #[serde(tag = "type")]
    pub enum NotificationEvent {
        #[serde(rename = "notification_confirm")]
        Confirm { id: String },
        #[serde(rename = "notification_accept")]
        Accept { id: String },
        #[serde(rename = "notification_dismiss")]
        Dismiss { id: String },
        #[serde(rename = "notification_timeout")]
        Timeout { id: String },
    }
}

