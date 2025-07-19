use tauri_plugin_store2::ScopedStoreKey;

#[derive(serde::Deserialize, specta::Type, PartialEq, Eq, Hash, strum::Display)]
pub enum StoreKey {
    Model,
    /// Track if user has been migrated from Llama3p2_3bQ4 to HyprLLM default
    DefaultModelMigrated,
    /// Track the last app version that ran migrations
    LastMigrationVersion,
}

impl ScopedStoreKey for StoreKey {}
