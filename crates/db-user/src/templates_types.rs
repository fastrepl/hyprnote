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
    /// Constructs a `Template` from a database row.
    ///
    /// Maps columns to `Template` fields as follows:
    /// - column 0 → `id` (panics if missing),
    /// - column 1 → `user_id` (panics if missing),
    /// - column 2 → `title` (panics if missing),
    /// - column 3 → `description` (panics if missing),
    /// - column 4 → `sections` (expects JSON string; defaults to empty `Vec` if absent),
    /// - column 5 → `tags` (expects JSON string; defaults to empty `Vec` if absent),
    /// - column 6 → `context_option` (set to `None` if missing or unreadable),
    /// - column 7 → `created_at` (falls back to current UTC time in RFC3339 seconds precision if unavailable).
    ///
    /// Note: JSON deserialization for `sections` and `tags` is unwrapped and will panic on invalid JSON. Required primitive columns (id, user_id, title, description) use `expect` and will panic if absent.
    ///
    /// # Examples
    ///
    /// ```ignore
    /// // `row` must be obtained from libsql query results.
    /// let template = Template::from_row(&row).expect("valid row");
    /// assert!(!template.id.is_empty());
    /// ```
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
            created_at: row.get(7).unwrap_or_else(|_| {
                chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Secs, true)
            }),
        })
    }
}