mod billing;
mod rpc;

use axum::{
    Router,
    routing::{get, post},
};
use utoipa::OpenApi;

use crate::config::SubscriptionConfig;
use crate::state::AppState;

pub use billing::{Interval, StartTrialResponse};
pub use rpc::CanStartTrialResponse;

#[derive(OpenApi)]
#[openapi(
    paths(
        rpc::can_start_trial,
        billing::start_trial,
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

pub fn router(config: SubscriptionConfig) -> Router {
    let state = AppState::new(config);

    Router::new()
        .route("/can-start-trial", get(rpc::can_start_trial))
        .route("/start-trial", post(billing::start_trial))
        .with_state(state)
}
