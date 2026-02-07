use axum::{Json, extract::State, http::HeaderMap};
use serde::Serialize;
use utoipa::ToSchema;

use crate::error::{IntegrationError, Result};
use crate::state::AppState;

#[derive(Debug, Serialize, ToSchema)]
pub struct ConnectSessionResponse {
    pub token: String,
    pub expires_at: String,
}

#[utoipa::path(
    post,
    path = "/connect-session",
    responses(
        (status = 200, description = "Connect session created", body = ConnectSessionResponse),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error"),
    ),
    tag = "integration",
    security(
        ("bearer_auth" = [])
    )
)]
pub async fn create_connect_session(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<ConnectSessionResponse>> {
    let auth_token = extract_token(&headers)?;

    let auth = state
        .config
        .auth
        .as_ref()
        .ok_or_else(|| IntegrationError::Auth("Auth not configured".to_string()))?;

    let claims = auth
        .verify_token(auth_token)
        .await
        .map_err(|e| IntegrationError::Auth(e.to_string()))?;
    let user_id = claims.sub;

    let req = hypr_nango::NangoConnectSessionRequest {
        end_user: hypr_nango::NangoConnectSessionRequestUser {
            id: user_id,
            display_name: None,
            email: None,
        },
        organization: None,
        allowed_integrations: vec![],
        integrations_config_defaults: None,
    };

    let res = state.nango.create_connect_session(req).await?;

    match res {
        hypr_nango::NangoConnectSessionResponse::Ok { token, expires_at } => {
            Ok(Json(ConnectSessionResponse { token, expires_at }))
        }
        hypr_nango::NangoConnectSessionResponse::Error { code } => {
            Err(IntegrationError::Nango(code))
        }
    }
}

fn extract_token(headers: &HeaderMap) -> Result<&str> {
    let auth_header = headers
        .get("Authorization")
        .and_then(|h| h.to_str().ok())
        .ok_or_else(|| IntegrationError::Auth("Missing Authorization header".to_string()))?;

    hypr_supabase_auth::SupabaseAuth::extract_token(auth_header)
        .ok_or_else(|| IntegrationError::Auth("Invalid Authorization header".to_string()))
}
