use serde::{Deserialize, Serialize};
use std::str::FromStr;

#[derive(Debug, Clone, Serialize, Deserialize, strum::Display, strum::EnumString, specta::Type)]
pub enum ConfigKind {
    #[serde(rename = "general")]
    #[strum(serialize = "general")]
    General,
    #[serde(rename = "profile")]
    #[strum(serialize = "profile")]
    Profile,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(tag = "type")]
pub enum Config {
    #[serde(rename = "general")]
    General { data: ConfigDataGeneral },
    #[serde(rename = "profile")]
    Profile { data: ConfigDataProfile },
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct ConfigDataGeneral {
    pub autostart: bool,
    pub notifications: bool,
    #[specta(type = String)]
    pub language: codes_iso_639::part_1::LanguageCode,
    pub context: String,
}

impl Default for ConfigDataGeneral {
    fn default() -> Self {
        Self {
            autostart: true,
            notifications: true,
            language: codes_iso_639::part_1::LanguageCode::En,
            context: "".to_string(),
        }
    }
}

#[derive(Debug, Default, Clone, Serialize, Deserialize, specta::Type)]
pub struct ConfigDataProfile {
    pub full_name: Option<String>,
    pub job_title: Option<String>,
    pub company_name: Option<String>,
    pub company_description: Option<String>,
    pub linkedin_username: Option<String>,
}

impl Config {
    pub fn from_row<'de>(row: &'de libsql::Row) -> Result<Self, serde::de::value::Error> {
        let kind = ConfigKind::from_str(row.get_str(0).expect("kind")).unwrap();
        let data = row.get_str(1).expect("data");

        match kind {
            ConfigKind::General => Ok(Config::General {
                data: serde_json::from_str(data).unwrap(),
            }),
            ConfigKind::Profile => Ok(Config::Profile {
                data: serde_json::from_str(data).unwrap(),
            }),
        }
    }
}
