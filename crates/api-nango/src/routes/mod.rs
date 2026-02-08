mod connect;
mod webhook;

use axum::{Router, middleware, routing::post};
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
    let auth_state = state.auth.clone();

    Router::new()
        .route("/connect-session", post(connect::create_connect_session))
        .route_layer(middleware::from_fn_with_state(
            auth_state,
            hypr_api_auth::require_auth,
        ))
        .route("/webhook", post(webhook::nango_webhook))
        .with_state(state)
}
