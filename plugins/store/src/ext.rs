use std::sync::Arc;

pub trait StorePluginExt<R: tauri::Runtime> {
    fn store(&self) -> Result<Arc<tauri_plugin_store::Store<R>>, crate::Error>;
    fn scoped_store<K: ScopedStoreKey>(
        &self,
        scope: &str,
    ) -> Result<ScopedStore<R, K>, crate::Error>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> StorePluginExt<R> for T {
    fn store(&self) -> Result<std::sync::Arc<tauri_plugin_store::Store<R>>, crate::Error> {
        let app = self.app_handle();
        <tauri::AppHandle<R> as tauri_plugin_store::StoreExt<R>>::store(&app, "store.json")
            .map_err(Into::into)
    }

    fn scoped_store<K: ScopedStoreKey>(
        &self,
        scope: &str,
    ) -> Result<ScopedStore<R, K>, crate::Error> {
        let store = self.store()?;
        Ok(ScopedStore::new(store, scope.to_string()))
    }
}

pub trait ScopedStoreKey:
    std::cmp::Eq + std::hash::Hash + std::fmt::Display + serde::Serialize + serde::de::DeserializeOwned
{
}

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
