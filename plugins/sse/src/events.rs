#[derive(Debug, specta::Type, tauri_specta::Event)]
pub struct ServerSentEvent {
    pub data: String,
}
