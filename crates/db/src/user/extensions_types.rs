use crate::user_common_derives;

user_common_derives! {
    pub struct ExtensionDefinition {
        pub id: String,
        pub name: String,
        pub description: String,
        pub config_schema: String,
    }
}

user_common_derives! {
    pub struct ExtensionMapping {
        pub id: String,
        pub user_id: String,
        pub extension_id: String,
        pub enabled: bool,
        pub config: serde_json::Value,
    }
}
