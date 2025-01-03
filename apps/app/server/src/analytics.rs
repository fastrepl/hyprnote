use axum::{
    extract::{Request, State},
    http::StatusCode,
    middleware,
    response::Response,
    Extension,
};
use hypr_db::admin::User;

use crate::state::AnalyticsState;

pub async fn middleware_fn(
    Extension(user): Extension<User>,
    State(state): State<AnalyticsState>,
    req: Request,
    next: middleware::Next,
) -> Result<Response, StatusCode> {
    let payload = hypr_analytics::AnalyticsPayload::for_user(user.id.to_string())
        .event("test_event")
        .with("key1", "value1")
        .with("key2", 2)
        .build();

    let _ = state.analytics.event(payload).await;

    Ok(next.run(req).await)
}
