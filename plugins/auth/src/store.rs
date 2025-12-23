use tauri_plugin_store2::ScopedStoreKey;

#[derive(serde::Deserialize, specta::Type, PartialEq, Eq, Hash, strum::Display)]
pub enum StoreKey {
    #[strum(serialize = "access_token")]
    AccessToken,
    #[strum(serialize = "refresh_token")]
    RefreshToken,
}

impl ScopedStoreKey for StoreKey {}
