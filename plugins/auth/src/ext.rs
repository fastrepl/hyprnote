use tauri_plugin_store2::StorePluginExt;

pub trait AuthPluginExt<R: tauri::Runtime> {
    fn get_item(&self, key: String) -> Result<Option<String>, crate::Error>;
    fn set_item(&self, key: String, value: String) -> Result<(), crate::Error>;
    fn remove_item(&self, key: String) -> Result<(), crate::Error>;
    fn clear_auth(&self) -> Result<(), crate::Error>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> crate::AuthPluginExt<R> for T {
    fn get_item(&self, key: String) -> Result<Option<String>, crate::Error> {
        let store = self.scoped_store(crate::PLUGIN_NAME)?;
        store.get::<String>(key).map_err(Into::into)
    }

    fn set_item(&self, key: String, value: String) -> Result<(), crate::Error> {
        let store = self.scoped_store(crate::PLUGIN_NAME)?;
        store.set(key, value)?;
        store.save()?;
        Ok(())
    }

    fn remove_item(&self, key: String) -> Result<(), crate::Error> {
        let store = self.scoped_store(crate::PLUGIN_NAME)?;
        store.set(key, serde_json::Value::Null)?;
        store.save()?;
        Ok(())
    }

    fn clear_auth(&self) -> Result<(), crate::Error> {
        let store = self.scoped_store(crate::PLUGIN_NAME)?;
        store.set("access_token".to_string(), serde_json::Value::Null)?;
        store.set("refresh_token".to_string(), serde_json::Value::Null)?;
        store.save()?;
        Ok(())
    }
}
