use crate::user_common_derives;

user_common_derives! {
    pub struct Template {
        pub id: String,
        pub user_id: String,
        pub title: String,
        pub description: String,
        pub sections: Vec<TemplateSection>,
        pub tags: Vec<String>,
        pub context_option: Option<String>,
        #[serde(default = "Template::default_created_at")]
        pub created_at: String,
    }
}

user_common_derives! {
    pub struct TemplateSection {
        pub title: String,
        pub description: String,
    }
}

impl Template {
    pub fn default_created_at() -> String {
        chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true)
    }

    pub fn from_row(row: &libsql::Row) -> Result<Self, serde::de::value::Error> {
        Ok(Self {
            id: row.get(0).expect("id"),
            user_id: row.get(1).expect("user_id"),
            title: row.get(2).expect("title"),
            description: row.get(3).expect("description"),
            sections: row
                .get_str(4)
                .map(|s| serde_json::from_str(s).unwrap())
                .unwrap_or_default(),
            tags: row
                .get_str(5)
                .map(|s| serde_json::from_str(s).unwrap())
                .unwrap_or_default(),
            context_option: row.get(6).ok(),
            created_at: row.get(7).unwrap_or_else(|_| Self::default_created_at()),
        })
    }
}
