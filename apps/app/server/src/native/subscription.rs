use axum::{http::StatusCode, Extension, Json};

pub async fn handler(
    Extension(billing): Extension<hypr_db_admin::Billing>,
) -> Result<Json<Subscription>, StatusCode> {
    let subscription = billing.stripe_subscription.map(|s| Subscription {
        status: s.status.into(),
        current_period_end: s.current_period_end,
        trial_end: s.trial_end,
        price_id: s
            .items
            .data
            .first()
            .map(|item| item.price.as_ref().map(|p| p.id.to_string()))
            .flatten(),
    });

    if let Some(subscription) = subscription {
        Ok(Json(subscription))
    } else {
        Err(StatusCode::NOT_FOUND)
    }
}

#[derive(Debug, serde::Serialize, schemars::JsonSchema)]
pub struct Subscription {
    pub status: SubscriptionStatus,
    pub current_period_end: i64,
    pub trial_end: Option<i64>,
    pub price_id: Option<String>,
}

#[derive(Debug, serde::Serialize, schemars::JsonSchema)]
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

impl From<stripe::SubscriptionStatus> for SubscriptionStatus {
    fn from(status: stripe::SubscriptionStatus) -> Self {
        match status {
            stripe::SubscriptionStatus::Active => SubscriptionStatus::Active,
            stripe::SubscriptionStatus::Canceled => SubscriptionStatus::Canceled,
            stripe::SubscriptionStatus::Incomplete => SubscriptionStatus::Incomplete,
            stripe::SubscriptionStatus::IncompleteExpired => SubscriptionStatus::IncompleteExpired,
            stripe::SubscriptionStatus::PastDue => SubscriptionStatus::PastDue,
            stripe::SubscriptionStatus::Paused => SubscriptionStatus::Paused,
            stripe::SubscriptionStatus::Trialing => SubscriptionStatus::Trialing,
            stripe::SubscriptionStatus::Unpaid => SubscriptionStatus::Unpaid,
        }
    }
}
