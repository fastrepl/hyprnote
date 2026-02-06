use axum::{Json, extract::State, http::HeaderMap};
use serde::Serialize;
use utoipa::ToSchema;

use crate::error::{Result, SubscriptionError};
use crate::state::AppState;

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CanStartTrialResponse {
    #[schema(example = true)]
    pub can_start_trial: bool,
}

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

pub fn extract_token(headers: &HeaderMap) -> Result<&str> {
    let auth_header = headers
        .get("Authorization")
        .and_then(|h| h.to_str().ok())
        .ok_or_else(|| SubscriptionError::Auth("Missing Authorization header".to_string()))?;

    hypr_supabase_auth::SupabaseAuth::extract_token(auth_header)
        .ok_or_else(|| SubscriptionError::Auth("Invalid Authorization header".to_string()))
}
