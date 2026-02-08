mod connect;
mod webhook;

use axum::{Router, routing::post};
use utoipa::OpenApi;

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
        (name = "integration", description = "Integration management via Nango")
    )
)]
pub struct ApiDoc;

pub fn openapi() -> utoipa::openapi::OpenApi {
    ApiDoc::openapi()
}

pub fn router(state: AppState) -> Router {
    Router::new()
        .route("/connect-session", post(connect::create_connect_session))
        .route("/webhook", post(webhook::nango_webhook))
        .with_state(state)
}
