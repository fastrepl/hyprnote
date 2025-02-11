use crate::user_common_derives;

user_common_derives! {
    pub struct Config {
        pub user_id: String,
        pub general: ConfigGeneral,
        pub notification: ConfigNotification,
    }
}

impl Config {
    pub fn from_row<'de>(row: &'de libsql::Row) -> Result<Self, serde::de::value::Error> {
        Ok(Self {
            user_id: row.get(0).expect("user_id"),
            general: row
                .get_str(1)
                .map(|s| serde_json::from_str(s).unwrap())
                .unwrap_or_default(),
            notification: row
                .get_str(2)
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
        pub speech_language: codes_iso_639::part_1::LanguageCode,
        #[specta(type = String)]
        #[schemars(with = "String", regex(pattern = "^[a-zA-Z]{2}$"))]
        pub display_language: codes_iso_639::part_1::LanguageCode,
        pub jargons: Vec<String>,
        pub tags: Vec<String>,
    }
}

impl Default for ConfigGeneral {
    fn default() -> Self {
        Self {
            autostart: true,
            speech_language: codes_iso_639::part_1::LanguageCode::Ko,
            display_language: codes_iso_639::part_1::LanguageCode::Ko,
            jargons: vec![],
            tags: vec![],
        }
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
