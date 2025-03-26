use codes_iso_639::part_1::LanguageCode;
use serde::Deserialize;
use std::str::FromStr;

use crate::user_common_derives;

user_common_derives! {
    pub struct Config {
        pub id: String,
        pub user_id: String,
        pub general: ConfigGeneral,
        pub notification: ConfigNotification,
        pub ai: ConfigAI,
    }
}

impl Config {
    pub fn from_row(row: &libsql::Row) -> Result<Self, serde::de::value::Error> {
        Ok(Self {
            id: row.get(0).expect("id"),
            user_id: row.get(1).expect("user_id"),
            general: row
                .get_str(2)
                .map(|s| serde_json::from_str(s).unwrap())
                .unwrap_or_default(),
            notification: row
                .get_str(3)
                .map(|s| serde_json::from_str(s).unwrap())
                .unwrap_or_default(),
            ai: row
                .get_str(4)
                .map(|s| serde_json::from_str(s).unwrap())
                .unwrap_or_default(),
        })
    }
}

user_common_derives! {
    pub struct ConfigGeneral {
        pub autostart: bool,
        #[specta(type = String)]
        #[schemars(with = "String", regex(pattern = "^[a-zA-Z]{2}$"))]
        #[serde(serialize_with = "serialize_language_code", deserialize_with = "deserialize_language_code")]
        pub display_language: LanguageCode,
        pub jargons: Vec<String>,
        pub telemetry_consent: bool,
    }
}

impl Default for ConfigGeneral {
    fn default() -> Self {
        Self {
            autostart: true,
            display_language: LanguageCode::En,
            jargons: vec![],
            telemetry_consent: true,
        }
    }
}

user_common_derives! {
    pub struct ConfigNotification {
        pub before: bool,
        pub auto: bool,
        #[serde(rename = "ignoredPlatforms")]
        pub ignored_platforms: Option<Vec<String>>,
    }
}

impl Default for ConfigNotification {
    fn default() -> Self {
        Self {
            before: true,
            auto: true,
            ignored_platforms: None,
        }
    }
}

user_common_derives! {
    #[derive(Default)]
    pub struct ConfigAI {
        pub api_base: Option<String>,
        pub api_key: Option<String>,
    }
}

fn serialize_language_code<S: serde::Serializer>(
    code: &LanguageCode,
    serializer: S,
) -> Result<S::Ok, S::Error> {
    serializer.serialize_str(code.code())
}

fn deserialize_language_code<'de, D: serde::Deserializer<'de>>(
    deserializer: D,
) -> Result<LanguageCode, D::Error> {
    let s = String::deserialize(deserializer)?;
    LanguageCode::from_str(&s).map_err(serde::de::Error::custom)
}
