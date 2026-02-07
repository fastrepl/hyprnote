use axum::{Json, extract::State, http::HeaderMap};
use serde::Serialize;
use utoipa::ToSchema;

use crate::error::{IntegrationError, Result};
use crate::state::AppState;

#[derive(Debug, Serialize, ToSchema)]
pub struct WebhookResponse {
    pub status: String,
}

#[utoipa::path(
    post,
    path = "/webhook",
    responses(
        (status = 200, description = "Webhook processed", body = WebhookResponse),
        (status = 401, description = "Invalid signature"),
        (status = 400, description = "Bad request"),
    ),
    tag = "integration",
)]
pub async fn nango_webhook(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: String,
) -> Result<Json<WebhookResponse>> {
    let signature = headers
        .get("x-nango-hmac-sha256")
        .and_then(|h| h.to_str().ok())
        .ok_or_else(|| IntegrationError::Auth("Missing X-Nango-Hmac-Sha256 header".to_string()))?;

    let valid = hypr_nango::verify_webhook_signature(
        &state.config.nango_webhook_secret,
        body.as_bytes(),
        signature,
    );
    if !valid {
        return Err(IntegrationError::Auth("Invalid webhook signature".to_string()));
    }

    let payload: hypr_nango::NangoAuthWebhook =
        serde_json::from_str(&body).map_err(|e| IntegrationError::BadRequest(e.to_string()))?;

    tracing::info!(
        webhook_type = %payload.r#type,
        operation = %payload.operation,
        connection_id = %payload.connection_id,
        end_user_id = %payload.end_user.end_user_id,
        "nango webhook received"
    );

    Ok(Json(WebhookResponse {
        status: "ok".to_string(),
    }))
}
