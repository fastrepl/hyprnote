use axum::{Json, extract::State, http::HeaderMap};
use serde::Serialize;

use crate::error::{Result, SubscriptionError};
use crate::state::AppState;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CanStartTrialResponse {
    can_start_trial: bool,
}

pub async fn can_start_trial(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<CanStartTrialResponse>> {
    let auth_token = extract_token(&headers)?;

    if let Some(auth) = &state.config.auth {
        auth.verify_token(auth_token)
            .await
            .map_err(|e| SubscriptionError::Auth(e.to_string()))?;
    }

    let can_start: bool = state
        .supabase
        .rpc("can_start_trial", auth_token, None)
        .await?;

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
