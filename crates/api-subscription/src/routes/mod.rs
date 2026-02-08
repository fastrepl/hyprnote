mod billing;
mod rpc;

use axum::{
    Router, middleware,
    routing::{get, post},
};
use utoipa::OpenApi;

use crate::state::AppState;

pub use billing::{Interval, StartTrialResponse};
pub use rpc::{AuthContext, CanStartTrialResponse};

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

pub fn router(state: AppState) -> Router {
    let auth_state = state.auth.clone();

    Router::new()
        .route("/can-start-trial", get(rpc::can_start_trial))
        .route("/start-trial", post(billing::start_trial))
        .route_layer(middleware::from_fn_with_state(
            auth_state,
            hypr_api_auth::require_auth,
        ))
        .with_state(state)
}
