use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Serialize, Deserialize, Type)]
#[serde(untagged)]
pub enum Config {
    V0(ConfigV0),
}

#[derive(Debug, Serialize, Deserialize, Type)]
pub struct ConfigV0 {
    version: u8,
    language: Language,
    user_name: String,
}

impl Default for Config {
    fn default() -> Self {
        Self::V0(ConfigV0::default())
    }
}

impl Default for ConfigV0 {
    fn default() -> Self {
        Self {
            version: 0,
            language: Language::default(),
            user_name: "You".to_string(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Type)]
enum Language {
    English,
    Korean,
}

impl Default for Language {
    fn default() -> Self {
        Self::English
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = Config::default();
        match config {
            Config::V0(cfg_v0) => {
                assert_eq!(cfg_v0.version, 0);
            }
        }
    }
}
