#[derive(
    std::cmp::Eq,
    std::cmp::PartialEq,
    std::hash::Hash,
    specta::Type,
    strum::Display,
    serde::Deserialize,
)]
pub enum AuthStoreKey {
    #[strum(serialize = "auth-user-id")]
    #[serde(rename = "auth-user-id")]
    #[specta(rename = "auth-user-id")]
    UserId,
    #[strum(serialize = "auth-account-id")]
    #[serde(rename = "auth-account-id")]
    #[specta(rename = "auth-account-id")]
    AccountId,
}

impl tauri_plugin_store2::ScopedStoreKey for AuthStoreKey {}
