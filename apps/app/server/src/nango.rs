use axum::{
    extract::{Json, State},
    http::StatusCode,
    response::IntoResponse,
};

use crate::state::WebhookState;

// https://docs.nango.dev/guides/webhooks/webhooks-from-nango#auth-webhooks
pub async fn handler(
    State(state): State<WebhookState>,
    Json(input): Json<hypr_nango::NangoConnectWebhook>,
) -> Result<impl IntoResponse, StatusCode> {
    let connection = state
        .nango
        .get_connection(input.connection_id)
        .await
        .map_err(|_| StatusCode::NOT_FOUND)?;

    let clerk_user_id = input.end_user.end_user_id;
    let user = state
        .admin_db
        .get_user_by_clerk_user_id(clerk_user_id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    let integration = hypr_db_admin::Integration {
        id: uuid::Uuid::new_v4().to_string(),
        user_id: user.id,
        nango_integration_id: connection
            .provider
            .try_into()
            .map_err(|_| StatusCode::NOT_FOUND)?,
        nango_connection_id: connection.connection_id,
    };

    let _ = state
        .admin_db
        .upsert_integration(integration)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::OK)
}
