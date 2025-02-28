use tauri_plugin_store::StoreExt;

#[derive(Debug, serde::Serialize, serde::Deserialize, strum::AsRefStr, specta::Type)]
pub enum StoreKey {
    #[strum(serialize = "auth-user-id")]
    #[serde(rename = "auth-user-id")]
    #[specta(rename = "auth-user-id")]
    UserId,
    #[strum(serialize = "auth-account-id")]
    #[serde(rename = "auth-account-id")]
    #[specta(rename = "auth-account-id")]
    AccountId,
}

pub fn get_store<R: tauri::Runtime, T: tauri::Manager<R>>(
    app: &T,
) -> std::sync::Arc<tauri_plugin_store::Store<R>> {
    app.store("store.json").unwrap()
}
