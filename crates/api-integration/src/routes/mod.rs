mod connect;

use axum::{Router, routing::post};
use utoipa::OpenApi;

use crate::state::AppState;

pub use connect::ConnectSessionResponse;

#[derive(OpenApi)]
#[openapi(
    paths(
        connect::create_connect_session,
    ),
    components(
        schemas(
            ConnectSessionResponse,
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
        .with_state(state)
}
