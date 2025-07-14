use tauri_plugin_store2::StorePluginExt;

pub trait ObsidianPluginExt<R: tauri::Runtime> {
    fn obsidian_store(&self) -> tauri_plugin_store2::ScopedStore<R, crate::StoreKey>;
    fn is_configured(&self) -> Result<bool, crate::Error>;

    fn get_api_key(&self) -> Result<Option<String>, crate::Error>;
    fn set_api_key(&self, api_key: String) -> Result<(), crate::Error>;

    fn get_base_url(&self) -> Result<Option<String>, crate::Error>;
    fn set_base_url(&self, base_url: String) -> Result<(), crate::Error>;

    fn get_vault_name(&self) -> Result<Option<String>, crate::Error>;
    fn set_vault_name(&self, vault_name: String) -> Result<(), crate::Error>;

    fn get_base_folder(&self) -> Result<Option<String>, crate::Error>;
    fn set_base_folder(&self, base_folder: String) -> Result<(), crate::Error>;

    fn get_enabled(&self) -> Result<bool, crate::Error>;
    fn set_enabled(&self, enabled: bool) -> Result<(), crate::Error>;

    fn get_deep_link_url(&self, note_name: String) -> Result<String, crate::Error>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> ObsidianPluginExt<R> for T {
    fn obsidian_store(&self) -> tauri_plugin_store2::ScopedStore<R, crate::StoreKey> {
        self.scoped_store(crate::PLUGIN_NAME).unwrap()
    }

    fn is_configured(&self) -> Result<bool, crate::Error> {
        let api_key = self.get_api_key()?;
        let base_url = self.get_base_url()?;

        Ok(api_key.is_some() && base_url.is_some())
    }

    fn get_api_key(&self) -> Result<Option<String>, crate::Error> {
        let store = self.obsidian_store();
        let v = store.get::<String>(crate::StoreKey::ApiKey)?;
        Ok(v)
    }

    fn set_api_key(&self, api_key: String) -> Result<(), crate::Error> {
        let store = self.obsidian_store();
        store.set(crate::StoreKey::ApiKey, Some(api_key))?;
        store.save()?;
        Ok(())
    }

    fn get_base_url(&self) -> Result<Option<String>, crate::Error> {
        let store = self.obsidian_store();
        let v = store.get::<String>(crate::StoreKey::BaseUrl)?;
        Ok(v)
    }

    fn set_base_url(&self, base_url: String) -> Result<(), crate::Error> {
        let store = self.obsidian_store();
        store.set(crate::StoreKey::BaseUrl, base_url)?;
        store.save()?;
        Ok(())
    }

    fn get_vault_name(&self) -> Result<Option<String>, crate::Error> {
        let store = self.obsidian_store();
        let v = store.get::<String>(crate::StoreKey::VaultName)?;
        Ok(v)
    }

    fn set_vault_name(&self, vault_name: String) -> Result<(), crate::Error> {
        let store = self.obsidian_store();
        store.set(crate::StoreKey::VaultName, vault_name)?;
        store.save()?;
        Ok(())
    }

    fn get_base_folder(&self) -> Result<Option<String>, crate::Error> {
        let store = self.obsidian_store();
        let v = store.get::<String>(crate::StoreKey::BaseFolder)?;
        Ok(v)
    }

    fn set_base_folder(&self, base_folder: String) -> Result<(), crate::Error> {
        let store = self.obsidian_store();
        store.set(crate::StoreKey::BaseFolder, base_folder)?;
        store.save()?;
        Ok(())
    }

    fn get_enabled(&self) -> Result<bool, crate::Error> {
        let store = self.obsidian_store();
        let v = store.get::<bool>(crate::StoreKey::Enabled)?;
        Ok(v.unwrap_or(false))
    }

    fn set_enabled(&self, enabled: bool) -> Result<(), crate::Error> {
        let store = self.obsidian_store();
        store.set(crate::StoreKey::Enabled, enabled)?;
        store.save()?;
        Ok(())
    }

    fn get_deep_link_url(&self, note_name: String) -> Result<String, crate::Error> {
        let store = self.obsidian_store();
        let vault_name = store
            .get::<String>(crate::StoreKey::VaultName)?
            .ok_or(crate::Error::VaultNameNotConfigured)?;

        Ok(format!(
            "obsidian://open?vault={}&file={}",
            vault_name, note_name
        ))
    }
}
