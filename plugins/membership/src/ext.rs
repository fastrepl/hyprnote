use std::future::Future;
use tauri_plugin_store2::StorePluginExt;

pub trait MembershipPluginExt<R: tauri::Runtime> {
    fn membership_store(&self) -> tauri_plugin_store2::ScopedStore<R, crate::StoreKey>;
    fn get_subscription(&self) -> impl Future<Output = Result<Option<Subscription>, crate::Error>>;
    fn refresh(&self) -> impl Future<Output = Result<Subscription, crate::Error>>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> MembershipPluginExt<R> for T {
    fn membership_store(&self) -> tauri_plugin_store2::ScopedStore<R, crate::StoreKey> {
        self.scoped_store(crate::PLUGIN_NAME).unwrap()
    }

    async fn get_subscription(&self) -> Result<Option<Subscription>, crate::Error> {
        let data = self
            .membership_store()
            .get::<Subscription>(crate::StoreKey::Subscription)?;

        Ok(data)
    }

    async fn refresh(&self) -> Result<Subscription, crate::Error> {
        let url = if cfg!(debug_assertions) {
            "http://localhost:1234/api/desktop/subscription"
        } else {
            "https://app.hypr.com/api/desktop/subscription"
        };

        let resp = reqwest::get(url).await?;
        let data: Subscription = resp.json().await?;

        self.membership_store()
            .set(crate::StoreKey::Subscription, data.clone())?;
        Ok(data)
    }
}

#[derive(
    Debug, Clone, serde::Deserialize, serde::Serialize, schemars::JsonSchema, specta::Type,
)]
pub struct Subscription {
    pub status: SubscriptionStatus,
    pub current_period_end: i64,
    pub trial_end: Option<i64>,
    pub price_id: Option<String>,
}

#[derive(
    Debug, Clone, serde::Deserialize, serde::Serialize, schemars::JsonSchema, specta::Type,
)]
#[serde(rename_all = "snake_case")]
pub enum SubscriptionStatus {
    Active,
    Canceled,
    Incomplete,
    IncompleteExpired,
    PastDue,
    Paused,
    Trialing,
    Unpaid,
}
