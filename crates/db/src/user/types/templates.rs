use crate::user_common_derives;

user_common_derives! {
    pub struct Template {
        pub id: String,
        pub title: String,
        pub description: String,
        pub sections: Vec<TemplateSection>,
    }
}

user_common_derives! {
    pub struct TemplateSection {
        pub title: String,
        pub description: String,
    }
}

impl Template {
    pub fn from_row<'de>(row: &'de libsql::Row) -> Result<Self, serde::de::value::Error> {
        Ok(Self {
            id: row.get(0).expect("id"),
            title: row.get(1).expect("title"),
            description: row.get(2).expect("description"),
            sections: row
                .get_str(3)
                .map(|s| serde_json::from_str(s).unwrap())
                .unwrap_or_default(),
        })
    }
}
