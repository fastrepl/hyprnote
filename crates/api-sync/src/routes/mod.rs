use axum::Router;
use utoipa::OpenApi;

use crate::state::AppState;

#[derive(OpenApi)]
#[openapi(
    paths(),
    components(schemas()),
    tags(
        (name = "sync", description = "Sync management")
    )
)]
pub struct ApiDoc;

pub fn openapi() -> utoipa::openapi::OpenApi {
    ApiDoc::openapi()
}

pub fn router(state: AppState) -> Router {
    Router::new().with_state(state)
}
