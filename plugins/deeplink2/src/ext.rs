use crate::{DeepLink, DeepLinkInfo};

pub trait DeepLink2PluginExt<R: tauri::Runtime> {
    fn parse_deep_link(&self, url: &str) -> crate::Result<DeepLink>;
    fn get_available_deep_links(&self) -> Vec<DeepLinkInfo>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> DeepLink2PluginExt<R> for T {
    fn parse_deep_link(&self, url: &str) -> crate::Result<DeepLink> {
        DeepLink::parse(url)
    }

    fn get_available_deep_links(&self) -> Vec<DeepLinkInfo> {
        DeepLink::available_deep_links()
    }
}
