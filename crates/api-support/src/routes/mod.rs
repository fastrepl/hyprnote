pub(crate) mod feedback;

use axum::{Router, routing::post};

use crate::config::SupportConfig;
use crate::state::AppState;

pub use feedback::{FeedbackRequest, FeedbackResponse};

pub fn router(config: SupportConfig) -> Router {
    let state = AppState::new(config);

    Router::new()
        .route("/submit", post(feedback::submit))
        .with_state(state)
}
