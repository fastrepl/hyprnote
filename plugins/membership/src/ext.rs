use tauri_plugin_store2::StorePluginExt;

pub trait MembershipPluginExt<R: tauri::Runtime> {
    fn membership_store(&self) -> tauri_plugin_store2::ScopedStore<R, crate::StoreKey>;
    fn refresh(&self) -> Result<(), crate::Error>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> MembershipPluginExt<R> for T {
    fn membership_store(&self) -> tauri_plugin_store2::ScopedStore<R, crate::StoreKey> {
        self.scoped_store(crate::PLUGIN_NAME).unwrap()
    }

    fn refresh(&self) -> Result<(), crate::Error> {
        todo!()
    }
}
