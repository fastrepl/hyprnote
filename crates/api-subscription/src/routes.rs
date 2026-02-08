use axum::{
    Router,
    routing::{get, post},
};
use utoipa::OpenApi;

use crate::handlers;
use crate::state::AppState;

pub use crate::handlers::trial::{CanStartTrialResponse, StartTrialResponse};
pub use crate::models::Interval;

#[derive(OpenApi)]
#[openapi(
    paths(
        handlers::can_start_trial,
        handlers::start_trial,
    ),
    components(
        schemas(
            CanStartTrialResponse,
            StartTrialResponse,
            Interval,
        )
    ),
    tags(
        (name = "subscription", description = "Subscription and trial management")
    )
)]
pub struct ApiDoc;

pub fn openapi() -> utoipa::openapi::OpenApi {
    ApiDoc::openapi()
}

pub fn router(state: AppState) -> Router {
    Router::new()
        .route("/can-start-trial", get(handlers::can_start_trial))
        .route("/start-trial", post(handlers::start_trial))
        .with_state(state)
}
