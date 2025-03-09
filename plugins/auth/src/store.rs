use crate::PLUGIN_NAME;
use tauri_plugin_store::StoreExt;

#[derive(
    Debug,
    serde::Serialize,
    serde::Deserialize,
    strum::AsRefStr,
    specta::Type,
    std::cmp::Eq,
    std::cmp::PartialEq,
    std::hash::Hash,
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

trait StoreKey: std::cmp::Eq + std::hash::Hash {}

impl StoreKey for AuthStoreKey {}

struct Data<K: StoreKey> {
    value: std::collections::HashMap<K, tauri_plugin_store::JsonValue>,
}

impl<K: StoreKey> Default for Data<K> {
    fn default() -> Self {
        Self {
            value: std::collections::HashMap::new(),
        }
    }
}

impl<K: StoreKey> Data<K> {
    pub fn get(&self, key: K) -> Option<&tauri_plugin_store::JsonValue> {
        self.value.get(&key)
    }
}

pub struct Store<R: tauri::Runtime> {
    scope: String,
    store: std::sync::Arc<tauri_plugin_store::Store<R>>,
}

impl<R: tauri::Runtime> Store<R> {
    pub fn new(app: &tauri::App<R>) -> Self {
        let a = Data::<AuthStoreKey>::default();

        Self {
            scope: PLUGIN_NAME.into(),
            store: app.store("store.json").unwrap(),
        }
    }

    // pub fn get(&self, key: StoreKey) -> Result<Option<String>, String> {
    //     let base = self.store.get(&self.scope);
    //     // base: Option<Value>
    //     // 1. If base is Some + Value is String, (Value = serde_json::Value), try to parse it, and get using StoreKey.to_string()
    //     // 2. otherwise, just return None
    // }

    // pub fn set(&self, key: StoreKey, value: String) -> Result<(), String> {
    //     // fetch base (self.store.get(&self.scope);)
    //     // if base is None, setup
    // }
}

pub fn get_store<R: tauri::Runtime, T: tauri::Manager<R>>(
    app: &T,
) -> std::sync::Arc<tauri_plugin_store::Store<R>> {
    app.store("store.json").unwrap()
}
