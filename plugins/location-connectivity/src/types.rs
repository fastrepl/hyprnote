use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct LocationStatus {
    pub is_enabled: bool,
    pub current_ssid: Option<String>,
    pub is_in_trusted_location: bool,
    pub trusted_ssids: Vec<String>,
    pub should_use_cloud: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct TrustedLocation {
    pub ssid: String,
    pub name: Option<String>,
    pub added_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type, tauri_specta::Event)]
pub struct LocationEvent {
    pub event_type: LocationEventType,
    pub current_ssid: Option<String>,
    pub is_trusted: bool,
    pub should_use_cloud: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "snake_case")]
pub enum LocationEventType {
    LocationChanged,
    TrustStatusChanged,
    SettingsChanged,
}

impl Default for LocationStatus {
    fn default() -> Self {
        Self {
            is_enabled: false,
            current_ssid: None,
            is_in_trusted_location: false,
            trusted_ssids: Vec::new(),
            should_use_cloud: false,
        }
    }
}