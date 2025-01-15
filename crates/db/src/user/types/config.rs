use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, strum::Display, specta::Type)]
pub enum ConfigKind {
    #[serde(rename = "profile")]
    #[strum(serialize = "profile")]
    Profile,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct Config {
    pub kind: ConfigKind,
    pub data: serde_json::Value,
}
