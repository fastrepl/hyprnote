use axum::{extract::State, http::StatusCode, Extension, Json};

use crate::state::AppState;

pub async fn handler(
    Extension(billing): Extension<hypr_db_admin::Billing>,
) -> Result<Json<Subscription>, StatusCode> {
    // let a = billing.stripe_subscription.map(|s| s.);

    let subscription = Subscription {};

    Ok(Json(subscription))
}

#[derive(Debug, serde::Serialize, schemars::JsonSchema)]
pub struct Subscription {}
