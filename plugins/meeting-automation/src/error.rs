use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, thiserror::Error, Serialize, Deserialize, Type)]
pub enum Error {
    #[error("Meeting automation not enabled")]
    AutomationNotEnabled,
    #[error("Meeting automation already running")]
    AutomationAlreadyRunning,
    #[error("Meeting automation not running")]
    AutomationNotRunning,
    #[error("Failed to start meeting automation: {0}")]
    StartAutomationFailed(String),
    #[error("Failed to stop meeting automation: {0}")]
    StopAutomationFailed(String),
    #[error("Configuration error: {0}")]
    ConfigurationError(String),
    #[error("Database error: {0}")]
    DatabaseError(String),
    #[error("Notification error: {0}")]
    NotificationError(String),
    #[error("Detection error: {0}")]
    DetectionError(String),
}

pub type Result<T> = std::result::Result<T, Error>;

impl From<Error> for tauri::Error {
    fn from(err: Error) -> Self {
        tauri::Error::Anyhow(err.into())
    }
}
