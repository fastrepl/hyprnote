use tauri_plugin_store2::ScopedStoreKey;

#[derive(serde::Deserialize, specta::Type, PartialEq, Eq, Hash, strum::Display)]
pub enum StoreKey {
    CustomEnabled,
    CustomApiBase,
    CustomApiKey,
    CustomModel,
    AdminApiBase,
    AdminApiKey,
    OpenaiApiKey,
    OpenrouterApiKey,
    GeminiApiKey,
    ProviderSource,
    OthersApiKey,
    OthersApiBase,
    OthersModel,
    OpenaiModel,
    GeminiModel,
    OpenrouterModel,
}

impl ScopedStoreKey for StoreKey {}
