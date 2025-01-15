use serde::{Deserialize, Serialize};
use std::str::FromStr;

#[derive(Debug, Clone, Serialize, Deserialize, strum::Display, strum::EnumString, specta::Type)]
pub enum ConfigKind {
    #[serde(rename = "profile")]
    #[strum(serialize = "profile")]
    Profile,
}

#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
#[serde(tag = "type")]
pub enum Config {
    #[serde(rename = "profile")]
    Profile { data: ConfigDataProfile },
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
            ConfigKind::Profile => Ok(Config::Profile {
                data: serde_json::from_str(data).unwrap(),
            }),
        }
    }
}
