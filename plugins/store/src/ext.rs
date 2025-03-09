use std::sync::Arc;

const STORE_FILENAME: &str = "store.json";

pub trait StorePluginExt<R: tauri::Runtime> {
    fn store(&self) -> Result<Arc<tauri_plugin_store::Store<R>>, crate::Error>;
    fn scoped_store<K: ScopedStoreKey>(
        &self,
        scope: impl Into<String>,
    ) -> Result<ScopedStore<R, K>, crate::Error>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> StorePluginExt<R> for T {
    fn store(&self) -> Result<std::sync::Arc<tauri_plugin_store::Store<R>>, crate::Error> {
        let app = self.app_handle();
        <tauri::AppHandle<R> as tauri_plugin_store::StoreExt<R>>::store(&app, STORE_FILENAME)
            .map_err(Into::into)
    }

    fn scoped_store<K: ScopedStoreKey>(
        &self,
        scope: impl Into<String>,
    ) -> Result<ScopedStore<R, K>, crate::Error> {
        let store = self.store()?;
        Ok(ScopedStore::new(store, scope.into()))
    }
}

pub trait ScopedStoreKey: std::cmp::Eq + std::hash::Hash + std::fmt::Display {}

pub struct ScopedStore<R: tauri::Runtime, K: ScopedStoreKey> {
    scope: String,
    store: Arc<tauri_plugin_store::Store<R>>,
    _marker: std::marker::PhantomData<K>,
}

impl<R: tauri::Runtime, K: ScopedStoreKey> ScopedStore<R, K> {
    pub fn new(store: Arc<tauri_plugin_store::Store<R>>, scope: String) -> Self {
        Self {
            scope,
            store,
            _marker: std::marker::PhantomData,
        }
    }
}

impl<R: tauri::Runtime, K: ScopedStoreKey> ScopedStore<R, K> {
    pub fn save(&self) -> Result<(), crate::Error> {
        self.store.save().map_err(Into::into)
    }

    pub fn get<T: serde::de::DeserializeOwned>(&self, key: K) -> Result<Option<T>, crate::Error> {
        if let Some(v) = self.store.get(&self.scope) {
            if let Some(s) = v.as_str() {
                let sub_store = serde_json::from_str::<serde_json::Value>(s)
                    .map_err(Into::<crate::Error>::into)?;

                if let Some(val) = sub_store.get(key.to_string().as_str()) {
                    return serde_json::from_value(val.clone())
                        .map(Some)
                        .map_err(Into::<crate::Error>::into);
                }
                return Ok(None);
            } else {
                return Ok(None);
            }
        } else {
            return Ok(None);
        }
    }

    pub fn set<T: serde::Serialize>(&self, key: K, value: T) -> Result<(), crate::Error> {
        let mut sub_store = match self.store.get(&self.scope) {
            Some(val) => serde_json::from_str::<serde_json::Value>(val.as_str().unwrap_or("{}"))
                .map_err(Into::<crate::Error>::into)?,
            None => serde_json::Value::Object(serde_json::Map::new()),
        };

        sub_store[key.to_string().as_str()] =
            serde_json::to_value(value).map_err(Into::<crate::Error>::into)?;

        let json_string = serde_json::to_string(&sub_store).map_err(Into::<crate::Error>::into)?;
        self.store.set(&self.scope, json_string);
        Ok(())
    }
}
