use crate::user_common_derives;

user_common_derives! {
    pub struct ExtensionDefinition {
        pub id: String,
        pub title: String,
        pub description: String,
        pub implemented: bool,
        pub default: bool,
        pub cloud_only: bool,
        pub plugins: Vec<String>,
        pub tags: Vec<String>,
    }
}

user_common_derives! {
    #[sql_table("extension_mappings")]
    pub struct ExtensionMapping {
        pub id: String,
        pub user_id: String,
        pub extension_id: String,
        pub enabled: bool,
        pub config: serde_json::Value,
        pub widget_layout_mapping: serde_json::Value,
    }
}

impl ExtensionMapping {
    pub fn from_row(row: &libsql::Row) -> Result<Self, serde::de::value::Error> {
        Ok(Self {
            id: row.get(0).expect("id"),
            user_id: row.get(1).expect("user_id"),
            extension_id: row.get(2).expect("extension_id"),
            enabled: row.get(3).expect("enabled"),
            config: row
                .get_str(4)
                .map(|s| serde_json::from_str(s).unwrap())
                .unwrap_or_default(),
            widget_layout_mapping: row
                .get_str(5)
                .map(|s| serde_json::from_str(s).unwrap())
                .unwrap_or_default(),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extension_definition() {
        let generator = schemars::gen::SchemaSettings::draft07().into_generator();
        let schema = generator.into_root_schema_for::<ExtensionDefinition>();

        let current_dir = env!("CARGO_MANIFEST_DIR");
        let name = "definition.schema.json";
        let config_schema_path = std::path::PathBuf::from(current_dir)
            .join("../../extensions/")
            .join(name);

        let config_schema_content = serde_json::to_string_pretty(&schema).unwrap();
        std::fs::write(config_schema_path, config_schema_content).unwrap();
    }
}
