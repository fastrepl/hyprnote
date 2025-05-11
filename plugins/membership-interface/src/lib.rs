#[macro_export]
macro_rules! common_derives {
    ($item:item) => {
        #[derive(
            Debug, Clone, serde::Deserialize, serde::Serialize, schemars::JsonSchema, specta::Type,
        )]
        $item
    };
}

common_derives! {
    pub struct Subscription {
        pub status: SubscriptionStatus,
        pub current_period_end: i64,
        pub trial_end: Option<i64>,
        pub price_id: Option<String>,
    }
}

common_derives! {
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
}
