use axum::{
    Router,
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::get,
};
use serde::Serialize;

use crate::auth::{AuthError, AuthState};

#[derive(Clone)]
pub struct RpcState {
    auth: AuthState,
    supabase_url: String,
    supabase_anon_key: String,
    http_client: reqwest::Client,
}

impl RpcState {
    pub fn new(supabase_url: &str, supabase_anon_key: &str) -> Self {
        Self {
            auth: AuthState::new(supabase_url),
            supabase_url: supabase_url.trim_end_matches('/').to_string(),
            supabase_anon_key: supabase_anon_key.to_string(),
            http_client: reqwest::Client::new(),
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CanStartTrialResponse {
    can_start_trial: bool,
}

pub enum RpcError {
    Auth(AuthError),
    SupabaseRequest(String),
}

impl From<AuthError> for RpcError {
    fn from(err: AuthError) -> Self {
        Self::Auth(err)
    }
}

impl IntoResponse for RpcError {
    fn into_response(self) -> Response {
        match self {
            Self::Auth(err) => err.into_response(),
            Self::SupabaseRequest(msg) => {
                tracing::error!(error = %msg, "supabase_rpc_error");
                (StatusCode::INTERNAL_SERVER_ERROR, "supabase_rpc_error").into_response()
            }
        }
    }
}

async fn can_start_trial(
    State(state): State<RpcState>,
    headers: axum::http::HeaderMap,
) -> Result<axum::Json<CanStartTrialResponse>, RpcError> {
    let auth_header = headers
        .get("Authorization")
        .and_then(|h| h.to_str().ok())
        .ok_or(RpcError::Auth(AuthError::from(
            hypr_supabase_auth::Error::MissingAuthHeader,
        )))?;

    let token =
        hypr_supabase_auth::SupabaseAuth::extract_token(auth_header).ok_or(RpcError::Auth(
            AuthError::from(hypr_supabase_auth::Error::InvalidAuthHeader),
        ))?;

    state
        .auth
        .inner()
        .verify_token(token)
        .await
        .map_err(AuthError::from)?;

    let url = format!("{}/rest/v1/rpc/can_start_trial", state.supabase_url);

    let response = state
        .http_client
        .post(&url)
        .header("Authorization", auth_header)
        .header("apikey", &state.supabase_anon_key)
        .header("Content-Type", "application/json")
        .body("{}")
        .send()
        .await
        .map_err(|e| RpcError::SupabaseRequest(e.to_string()))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response
            .text()
            .await
            .unwrap_or_else(|_| "unknown error".to_string());
        return Err(RpcError::SupabaseRequest(format!(
            "Supabase RPC failed with status {}: {}",
            status, body
        )));
    }

    let can_start_trial: bool = response
        .json()
        .await
        .map_err(|e| RpcError::SupabaseRequest(e.to_string()))?;

    Ok(axum::Json(CanStartTrialResponse { can_start_trial }))
}

pub fn router(state: RpcState) -> Router {
    Router::new()
        .route("/can-start-trial", get(can_start_trial))
        .with_state(state)
}
