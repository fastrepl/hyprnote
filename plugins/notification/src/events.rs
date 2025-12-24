#[derive(serde::Serialize, Clone, specta::Type, tauri_specta::Event)]
#[serde(tag = "type")]
pub enum NotificationEvent {
    #[serde(rename = "confirm")]
    Confirm,
}
