use std::future::Future;
use tauri_plugin_store2::StorePluginExt;

pub struct Subscription {}

pub trait MembershipPluginExt<R: tauri::Runtime> {
    fn membership_store(&self) -> tauri_plugin_store2::ScopedStore<R, crate::StoreKey>;
    fn get_subscription(&self) -> impl Future<Output = Result<Option<Subscription>, crate::Error>>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> MembershipPluginExt<R> for T {
    fn membership_store(&self) -> tauri_plugin_store2::ScopedStore<R, crate::StoreKey> {
        self.scoped_store(crate::PLUGIN_NAME).unwrap()
    }

    async fn get_subscription(&self) -> Result<Option<Subscription>, crate::Error> {
        Ok(None)
    }
}
