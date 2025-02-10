use crate::user_common_derives;

user_common_derives! {
    #[derive(Default)]
    pub struct Config {
        pub general: ConfigGeneral,
        // TODO: we do not need this. this info should be modeled as Human.
        pub profile: ConfigProfile,
        pub notification: ConfigNotification,
    }
}

impl Config {
    pub fn from_row<'de>(row: &'de libsql::Row) -> Result<Self, serde::de::value::Error> {
        Ok(Self {
            general: row
                .get_str(1)
                .map(|s| serde_json::from_str(s).unwrap())
                .unwrap_or_default(),
            profile: row
                .get_str(2)
                .map(|s| serde_json::from_str(s).unwrap())
                .unwrap_or_default(),
            notification: row
                .get_str(3)
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
        pub spoken_language: codes_iso_639::part_1::LanguageCode,
        #[specta(type = String)]
        #[schemars(with = "String", regex(pattern = "^[a-zA-Z]{2}$"))]
        pub display_language: codes_iso_639::part_1::LanguageCode,
        pub jargons: Vec<String>,
    }
}

impl Default for ConfigGeneral {
    fn default() -> Self {
        Self {
            autostart: true,
            spoken_language: codes_iso_639::part_1::LanguageCode::Ko,
            display_language: codes_iso_639::part_1::LanguageCode::Ko,
            jargons: vec![],
        }
    }
}

user_common_derives! {
    #[derive(Default)]
    pub struct ConfigProfile {
        pub full_name: Option<String>,
        pub job_title: Option<String>,
        pub company_name: Option<String>,
        pub company_description: Option<String>,
        pub linkedin_username: Option<String>,
    }
}

user_common_derives! {
    pub struct ConfigNotification {
        pub before: bool,
        pub auto: bool
    }
}

impl Default for ConfigNotification {
    fn default() -> Self {
        Self {
            before: true,
            auto: true,
        }
    }
}
