pub(crate) mod feedback;

use axum::{Router, routing::post};

use crate::config::SupportConfig;
use crate::mcp::mcp_service;
use crate::state::AppState;

pub use feedback::{FeedbackRequest, FeedbackResponse};

pub fn router(config: SupportConfig) -> Router {
    let state = AppState::new(config);
    let mcp = mcp_service(state.clone());

    Router::new()
        .route("/submit", post(feedback::submit))
        .with_state(state)
        .nest_service("/mcp", mcp)
}
