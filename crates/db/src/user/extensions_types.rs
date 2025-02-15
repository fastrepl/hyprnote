use crate::user_common_derives;

user_common_derives! {
    pub struct ExtensionDefinition {
        pub id: String,
        pub default_enabled: bool,
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extension_definition() {
        let generator = schemars::gen::SchemaSettings::draft07().into_generator();
        let schema = generator.into_root_schema_for::<ExtensionDefinition>();

        let current_dir = env!("CARGO_MANIFEST_DIR");
        let config_schema_path =
            std::path::PathBuf::from(current_dir).join("../../extensions/config.schema.json");
        let config_schema_content = serde_json::to_string_pretty(&schema).unwrap();
        std::fs::write(config_schema_path, config_schema_content).unwrap();
    }
}
