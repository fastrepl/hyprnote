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

    let req = hypr_nango::CreateConnectSessionRequest {
        end_user: hypr_nango::EndUser {
            id: user_id,
            display_name: None,
            email: None,
            tags: None,
        },
        organization: None,
        allowed_integrations: None,
        integrations_config_defaults: None,
    };

    let session = state.nango.create_connect_session(req).await?;

    Ok(Json(ConnectSessionResponse {
        token: session.token,
        expires_at: session.expires_at,
    }))
}

fn extract_token(headers: &HeaderMap) -> Result<&str> {
    let auth_header = headers
        .get("Authorization")
        .and_then(|h| h.to_str().ok())
        .ok_or_else(|| IntegrationError::Auth("Missing Authorization header".to_string()))?;

    hypr_supabase_auth::SupabaseAuth::extract_token(auth_header)
        .ok_or_else(|| IntegrationError::Auth("Invalid Authorization header".to_string()))
}
