mod connect;
mod webhook;

use axum::{Router, routing::post};
use utoipa::OpenApi;

use crate::config::NangoConfig;
use crate::state::AppState;

pub use connect::ConnectSessionResponse;
pub use webhook::WebhookResponse;

#[derive(OpenApi)]
#[openapi(
    paths(
        connect::create_connect_session,
        webhook::nango_webhook,
    ),
    components(
        schemas(
            ConnectSessionResponse,
            WebhookResponse,
        )
    ),
    tags(
        (name = "nango", description = "Integration management via Nango")
    )
)]
pub struct ApiDoc;

pub fn openapi() -> utoipa::openapi::OpenApi {
    ApiDoc::openapi()
}

pub fn router(config: NangoConfig) -> Result<Router, crate::error::NangoError> {
    let state = AppState::new(config)?;

    Ok(Router::new()
        .route("/connect-session", post(connect::create_connect_session))
        .with_state(state))
}

pub fn webhook_router(config: NangoConfig) -> Result<Router, crate::error::NangoError> {
    let state = AppState::new(config)?;

    Ok(Router::new()
        .route("/webhook", post(webhook::nango_webhook))
        .with_state(state))
}
