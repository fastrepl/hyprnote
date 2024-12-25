use axum::{
    extract::{Request, State},
    http::StatusCode,
    middleware,
    response::{IntoResponse, Response},
};

use crate::state::AppState;

// https://docs.rs/axum/latest/axum/middleware/index.html#passing-state-from-middleware-to-handlers
pub async fn middleware_fn(
    State(state): State<AppState>,
    req: Request,
    next: middleware::Next,
) -> Result<Response, StatusCode> {
    let auth_header = req
        .headers()
        .get(http::header::AUTHORIZATION)
        .and_then(|header| header.to_str().ok());

    let auth_header = if let Some(auth_header) = auth_header {
        auth_header
    } else {
        return Err(StatusCode::UNAUTHORIZED);
    };

    Ok(next.run(req).await)
}

pub async fn oauth_login_handler(State(state): State<AppState>) -> impl IntoResponse {
    todo!()
}

pub async fn oauth_callback_handler(State(state): State<AppState>) -> impl IntoResponse {
    todo!()
}
