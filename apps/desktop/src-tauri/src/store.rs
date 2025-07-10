use tauri_plugin_store2::ScopedStoreKey;

#[derive(serde::Deserialize, specta::Type, PartialEq, Eq, Hash, strum::Display)]
pub enum StoreKey {
    OnboardingNeeded,
    IndividualizationNeeded,
    AppOpenCount,
}

impl ScopedStoreKey for StoreKey {}
