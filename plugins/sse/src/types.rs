use std::collections::HashMap;

#[derive(Debug, specta::Type, serde::Deserialize)]
pub struct Request {
    pub method: String,
    pub url: String,
    pub headers: HashMap<String, String>,
    pub body: Vec<u8>,
}

#[derive(Debug, Clone, serde::Serialize, specta::Type)]
pub struct Response {
    #[specta(rename = "requestId")]
    pub request_id: u32,
    pub status: u16,
    pub headers: HashMap<String, String>,
}

#[derive(Debug, Clone, serde::Serialize, specta::Type, tauri_specta::Event)]
pub struct ServerSentEvent {
    #[specta(rename = "requestId")]
    pub request_id: u32,
    pub chunk: Option<Vec<u8>>,
}
