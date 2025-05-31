use std::future::Future;

use tauri_plugin_misc::MiscPluginExt;
use tauri_plugin_store2::StorePluginExt;

pub trait AnalyticsPluginExt<R: tauri::Runtime> {
    fn set_disabled(&self, disabled: bool) -> Result<(), crate::Error>;
    fn is_disabled(&self) -> Result<bool, crate::Error>;
    fn event(
        &self,
        payload: hypr_analytics::AnalyticsPayload,
    ) -> impl Future<Output = Result<(), crate::Error>>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> crate::AnalyticsPluginExt<R> for T {
    async fn event(
        &self,
        mut payload: hypr_analytics::AnalyticsPayload,
    ) -> Result<(), crate::Error> {
        let disabled = {
            let store = self.scoped_store(crate::PLUGIN_NAME)?;
            store.get(crate::StoreKey::Disabled)?.unwrap_or(false)
        };

        let app_version = self.config().version.clone();
        let app_identifier = self.config().identifier.clone();
        let git_hash = self.get_git_hash();
        let bundle_id = self.config().identifier.clone();

        payload
            .props
            .entry("app_version".into())
            .or_insert(app_version.into());

        payload
            .props
            .entry("app_identifier".into())
            .or_insert(app_identifier.into());

        payload
            .props
            .entry("bundle_id".into())
            .or_insert(bundle_id.into());

        payload
            .props
            .entry("git_hash".into())
            .or_insert(git_hash.into());

        if !disabled {
            let client = self.state::<hypr_analytics::AnalyticsClient>();
            client
                .event(payload)
                .await
                .map_err(crate::Error::HyprAnalytics)?;
        }

        Ok(())
    }

    fn set_disabled(&self, disabled: bool) -> Result<(), crate::Error> {
        {
            let store = self.scoped_store(crate::PLUGIN_NAME)?;
            store.set(crate::StoreKey::Disabled, disabled)?;
        }
        Ok(())
    }

    fn is_disabled(&self) -> Result<bool, crate::Error> {
        let store = self.scoped_store(crate::PLUGIN_NAME)?;
        let v = store.get(crate::StoreKey::Disabled)?.unwrap_or(false);
        Ok(v)
    }
}
