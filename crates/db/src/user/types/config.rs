use std::str::FromStr;

use crate::user_common_derives;

user_common_derives! {
    #[derive(strum::Display, strum::EnumString)]
    pub enum ConfigKind {
        #[serde(rename = "general")]
        #[strum(serialize = "general")]
        General,
        #[serde(rename = "profile")]
        #[strum(serialize = "profile")]
        Profile,
    }
}

user_common_derives! {
    #[serde(tag = "type")]
    pub enum Config {
        #[serde(rename = "general")]
        General { data: ConfigDataGeneral },
        #[serde(rename = "profile")]
        Profile { data: ConfigDataProfile },
    }
}

user_common_derives! {
    pub struct ConfigDataGeneral {
        pub autostart: bool,
        pub notifications: bool,
        #[specta(type = String)]
        #[schemars(with = "String", regex(pattern = "^[a-zA-Z]{2}$"))]
        pub language: codes_iso_639::part_1::LanguageCode,
        pub context: String,
    }
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

user_common_derives! {
    #[derive(Default)]
    pub struct ConfigDataProfile {
        pub full_name: Option<String>,
        pub job_title: Option<String>,
        pub company_name: Option<String>,
        pub company_description: Option<String>,
        pub linkedin_username: Option<String>,
    }
}

impl From<ConfigDataProfile> for Config {
    fn from(data: ConfigDataProfile) -> Self {
        Self::Profile { data }
    }
}

impl From<ConfigDataGeneral> for Config {
    fn from(data: ConfigDataGeneral) -> Self {
        Self::General { data }
    }
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
