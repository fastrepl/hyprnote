use axum::{
    Json,
    extract::{Query, State},
    http::HeaderMap,
};
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};

use crate::auth::extract_token;
use crate::error::{Result, SubscriptionError};
use crate::models::{Interval, Profile};
use crate::services::subscription::{create_customer, create_trial_subscription};
use crate::state::AppState;

/// Response for can_start_trial endpoint
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CanStartTrialResponse {
    #[schema(example = true)]
    pub can_start_trial: bool,
}

/// Query parameters for start_trial endpoint
#[derive(Debug, Deserialize, IntoParams)]
pub struct StartTrialQuery {
    #[serde(default)]
    #[param(example = "monthly")]
    pub interval: Interval,
}

/// Response for start_trial endpoint
#[derive(Debug, Serialize, ToSchema)]
pub struct StartTrialResponse {
    #[schema(example = true)]
    pub started: bool,
}

/// Checks if the authenticated user can start a trial subscription
#[utoipa::path(
    get,
    path = "/can-start-trial",
    responses(
        (status = 200, description = "Check successful", body = CanStartTrialResponse),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error"),
    ),
    tag = "subscription",
    security(
        ("bearer_auth" = [])
    )
)]
pub async fn can_start_trial(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<CanStartTrialResponse>> {
    let auth_token = extract_token(&headers)?;

    let auth = state
        .config
        .auth
        .as_ref()
        .ok_or_else(|| SubscriptionError::Auth("Auth not configured".to_string()))?;

    auth.verify_token(auth_token)
        .await
        .map_err(|e| SubscriptionError::Auth(e.to_string()))?;

    let can_start: bool = state
        .supabase
        .rpc("can_start_trial", auth_token, None)
        .await
        .unwrap_or(false);

    Ok(Json(CanStartTrialResponse {
        can_start_trial: can_start,
    }))
}

/// Starts a trial subscription for the authenticated user
#[utoipa::path(
    post,
    path = "/start-trial",
    params(StartTrialQuery),
    responses(
        (status = 200, description = "Trial started successfully", body = StartTrialResponse),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error"),
    ),
    tag = "subscription",
    security(
        ("bearer_auth" = [])
    )
)]
pub async fn start_trial(
    State(state): State<AppState>,
    Query(query): Query<StartTrialQuery>,
    headers: HeaderMap,
) -> Result<Json<StartTrialResponse>> {
    let auth_token = extract_token(&headers)?;

    let auth = state
        .config
        .auth
        .as_ref()
        .ok_or_else(|| SubscriptionError::Auth("Auth not configured".to_string()))?;

    let claims = auth
        .verify_token(auth_token)
        .await
        .map_err(|e| SubscriptionError::Auth(e.to_string()))?;
    let user_id = claims.sub;

    let can_start: bool = state
        .supabase
        .rpc("can_start_trial", auth_token, None)
        .await?;

    if !can_start {
        return Ok(Json(StartTrialResponse { started: false }));
    }

    let customer_id = get_or_create_customer(&state, auth_token, &user_id).await?;

    let customer_id = customer_id
        .ok_or_else(|| SubscriptionError::Internal("stripe_customer_id_missing".to_string()))?;

    let price_id = state.config.price_ids.get(query.interval);

    create_trial_subscription(&state.stripe, &customer_id, price_id, &user_id).await?;

    Ok(Json(StartTrialResponse { started: true }))
}

/// Gets the Stripe customer ID for a user or creates a new customer if none exists
async fn get_or_create_customer(
    state: &AppState,
    auth_token: &str,
    user_id: &str,
) -> Result<Option<String>> {
    let profiles: Vec<Profile> = state
        .supabase
        .select(
            "profiles",
            auth_token,
            "stripe_customer_id",
            &[("id", &format!("eq.{}", user_id))],
        )
        .await?;

    if let Some(profile) = profiles.first()
        && let Some(customer_id) = &profile.stripe_customer_id
    {
        return Ok(Some(customer_id.clone()));
    }

    let email = state.supabase.get_user_email(auth_token).await?;

    let customer_id = create_customer(&state.stripe, user_id, email.as_deref()).await?;

    #[derive(Serialize)]
    struct UpdateData {
        stripe_customer_id: String,
    }

    state
        .supabase
        .update(
            "profiles",
            auth_token,
            &[
                ("id", &format!("eq.{}", user_id)),
                ("stripe_customer_id", "is.null"),
            ],
            &UpdateData {
                stripe_customer_id: customer_id.clone(),
            },
        )
        .await?;

    let updated_profiles: Vec<Profile> = state
        .supabase
        .select(
            "profiles",
            auth_token,
            "stripe_customer_id",
            &[("id", &format!("eq.{}", user_id))],
        )
        .await?;

    Ok(updated_profiles
        .first()
        .and_then(|p| p.stripe_customer_id.clone()))
}
