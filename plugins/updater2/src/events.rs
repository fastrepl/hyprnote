#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type, tauri_specta::Event)]
pub struct UpdatedEvent {
    pub previous: Option<String>,
    pub current: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type, tauri_specta::Event)]
pub struct UpdateReadyEvent {
    pub version: String,
}
