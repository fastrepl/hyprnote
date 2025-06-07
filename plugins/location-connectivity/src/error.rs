use serde::{Deserialize, Serialize};

#[derive(thiserror::Error, Debug, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum LocationConnectivityError {
    #[error("Store error: {0}")]
    Store(String),
    
    #[error("WiFi detection error: {0}")]
    WifiDetection(String),
    
    #[error("Location detection not supported on this platform")]
    PlatformNotSupported,
    
    #[error("Permission denied for location access")]
    PermissionDenied,
    
    #[error("Network interface not available")]
    NetworkUnavailable,
    
    #[error("Invalid SSID format: {0}")]
    InvalidSsid(String),
    
    #[error("JSON error: {0}")]
    Json(String),
    
    #[error("Unknown error: {0}")]
    Unknown(String),
}

impl From<serde_json::Error> for LocationConnectivityError {
    fn from(err: serde_json::Error) -> Self {
        Self::Json(err.to_string())
    }
}

impl From<tauri_plugin_store2::Error> for LocationConnectivityError {
    fn from(err: tauri_plugin_store2::Error) -> Self {
        Self::Store(err.to_string())
    }
}