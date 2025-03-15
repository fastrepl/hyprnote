#[derive(serde::Serialize, Clone, specta::Type, tauri_specta::Event)]
pub enum AuthEvent {
    #[serde(rename = "success")]
    Success,
    #[serde(rename = "error")]
    Error(String),
}
