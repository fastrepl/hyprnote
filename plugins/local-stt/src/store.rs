use tauri_plugin_store2::ScopedStoreKey;

#[derive(serde::Deserialize, specta::Type, PartialEq, Eq, Hash, strum::Display)]
pub enum StoreKey {
    #[serde(rename = "DefaultModel")] // for backward compatibility
    CurrentModel,
    CustomBaseUrl,
    CustomApiKey,
}

impl ScopedStoreKey for StoreKey {}
