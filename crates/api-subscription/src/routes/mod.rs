mod billing;
mod rpc;

use axum::{
    Router,
    routing::{get, post},
};

use crate::state::AppState;

pub fn router(state: AppState) -> Router {
    Router::new()
        .route("/can-start-trial", get(rpc::can_start_trial))
        .route("/start-trial", post(billing::start_trial))
        .with_state(state)
}
