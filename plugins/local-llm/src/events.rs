#[derive(serde::Serialize, Clone, specta::Type, tauri_specta::Event)]
pub enum LLMEvent {
    #[serde(rename = "progress")]
    Progress(f64),
}
