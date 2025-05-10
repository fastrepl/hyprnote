use axum::{http::StatusCode, Extension, Json};
use tauri_plugin_membership::{Subscription, SubscriptionStatus};

pub async fn handler(
    Extension(billing): Extension<hypr_db_admin::Billing>,
) -> Result<Json<Subscription>, StatusCode> {
    let subscription = billing.stripe_subscription.map(|s| Subscription {
        status: match s.status {
            stripe::SubscriptionStatus::Active => SubscriptionStatus::Active,
            stripe::SubscriptionStatus::Canceled => SubscriptionStatus::Canceled,
            stripe::SubscriptionStatus::Incomplete => SubscriptionStatus::Incomplete,
            stripe::SubscriptionStatus::IncompleteExpired => SubscriptionStatus::IncompleteExpired,
            stripe::SubscriptionStatus::PastDue => SubscriptionStatus::PastDue,
            stripe::SubscriptionStatus::Paused => SubscriptionStatus::Paused,
            stripe::SubscriptionStatus::Trialing => SubscriptionStatus::Trialing,
            stripe::SubscriptionStatus::Unpaid => SubscriptionStatus::Unpaid,
        },
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
