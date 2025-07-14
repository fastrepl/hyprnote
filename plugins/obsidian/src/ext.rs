use tauri_plugin_store2::StorePluginExt;

pub trait ObsidianPluginExt<R: tauri::Runtime> {
    fn obsidian_store(&self) -> tauri_plugin_store2::ScopedStore<R, crate::StoreKey>;
    fn ping(&self) -> Result<bool, crate::Error>;
    fn is_configured(&self) -> Result<bool, crate::Error>;
    fn set_api_key(&self, api_key: String) -> Result<(), crate::Error>;
    fn set_base_url(&self, base_url: String) -> Result<(), crate::Error>;
    fn get_api_key(&self) -> Result<Option<String>, crate::Error>;
    fn get_base_url(&self) -> Result<Option<String>, crate::Error>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> ObsidianPluginExt<R> for T {
    fn obsidian_store(&self) -> tauri_plugin_store2::ScopedStore<R, crate::StoreKey> {
        self.scoped_store(crate::PLUGIN_NAME).unwrap()
    }

    fn ping(&self) -> Result<bool, crate::Error> {
        Ok(true)
    }

    fn is_configured(&self) -> Result<bool, crate::Error> {
        let api_key = self.get_api_key()?;
        let base_url = self.get_base_url()?;

        Ok(api_key.is_some() && base_url.is_some())
    }

    fn set_api_key(&self, api_key: String) -> Result<(), crate::Error> {
        let store = self.obsidian_store();
        store.set(crate::StoreKey::ApiKey, Some(api_key))?;
        store.save()?;
        Ok(())
    }

    fn set_base_url(&self, base_url: String) -> Result<(), crate::Error> {
        let store = self.obsidian_store();
        store.set(crate::StoreKey::BaseUrl, Some(base_url))?;
        store.save()?;
        Ok(())
    }

    fn get_api_key(&self) -> Result<Option<String>, crate::Error> {
        let store = self.obsidian_store();
        let v = store.get::<String>(crate::StoreKey::ApiKey)?;
        Ok(v)
    }

    fn get_base_url(&self) -> Result<Option<String>, crate::Error> {
        let store = self.obsidian_store();
        let v = store.get::<String>(crate::StoreKey::BaseUrl)?;
        Ok(v)
    }
}
