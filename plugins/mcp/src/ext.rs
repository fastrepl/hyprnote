use crate::error::Error;
use tauri_plugin_store2::StorePluginExt;

pub trait McpPluginExt<R: tauri::Runtime> {
    fn mcp_store(&self) -> tauri_plugin_store2::ScopedStore<R, crate::StoreKey>;
    fn get_servers(&self) -> Result<Vec<crate::McpServer>, Error>;
    fn set_servers(&self, servers: Vec<crate::McpServer>) -> Result<(), Error>;
}

impl<R: tauri::Runtime> McpPluginExt<R> for tauri::AppHandle<R> {
    fn mcp_store(&self) -> tauri_plugin_store2::ScopedStore<R, crate::StoreKey> {
        self.scoped_store(crate::PLUGIN_NAME).unwrap()
    }

    fn get_servers(&self) -> Result<Vec<crate::McpServer>, Error> {
        let store = self.mcp_store();
        let servers = store.get(crate::StoreKey::Servers)?.unwrap_or_default();
        Ok(servers)
    }

    fn set_servers(&self, servers: Vec<crate::McpServer>) -> Result<(), Error> {
        let store = self.mcp_store();
        store.set(crate::StoreKey::Servers, servers)?;
        Ok(())
    }
}
