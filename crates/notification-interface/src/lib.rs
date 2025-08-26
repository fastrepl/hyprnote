#[derive(Debug, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct Notification {
    pub title: String,
    pub message: String,
    pub url: Option<String>,
    pub timeout: Option<std::time::Duration>,
}
