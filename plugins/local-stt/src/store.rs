use tauri_plugin_store2::ScopedStoreKey;

#[derive(
    serde::Deserialize, serde::Serialize, specta::Type, PartialEq, Eq, Hash, strum::Display,
)]
pub enum StoreKey {
    Provider,
    #[serde(rename = "DefaultModel")] // for backward compatibility
    #[strum(serialize = "DefaultModel")]
    LocalModel,
    CustomModel,
    CustomBaseUrl,
    CustomApiKey,
}

#[derive(
    serde::Deserialize, serde::Serialize, specta::Type, PartialEq, Eq, Hash, strum::Display,
)]
pub enum Provider {
    Local,
    Custom,
}

impl ScopedStoreKey for StoreKey {}
