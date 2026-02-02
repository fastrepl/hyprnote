use tauri_plugin_store2::ScopedStoreKey;

#[derive(serde::Deserialize, specta::Type, PartialEq, Eq, Hash, strum::Display)]
pub enum StoreKey {
    // Also accessed from Rust
    OnboardingNeeded2,
    OnboardingLocal,
    // For frontend-only values, use TinybaseValues instead
    TinybaseValues,
}

impl ScopedStoreKey for StoreKey {}
