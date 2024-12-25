use axum::{
    extract::{Request, State},
    http::{header, StatusCode},
    middleware,
    response::{IntoResponse, Redirect, Response},
};

use crate::state::AppState;

#[derive(Clone)]
pub struct User {}

pub async fn middleware_fn(
    State(state): State<AppState>,
    mut req: Request,
    next: middleware::Next,
) -> Result<Response, StatusCode> {
    let auth_header = req
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|header| header.to_str().ok());

    let auth_header = if let Some(auth_header) = auth_header {
        auth_header
    } else {
        return Err(StatusCode::UNAUTHORIZED);
    };

    if true {
        req.extensions_mut().insert(User {});
        Ok(next.run(req).await)
    } else {
        Err(StatusCode::UNAUTHORIZED)
    }
}

pub async fn oauth_login_handler(State(state): State<AppState>) -> impl IntoResponse {
    Redirect::temporary("/")
}

pub async fn oauth_callback_handler(State(state): State<AppState>) -> impl IntoResponse {
    Redirect::temporary("/")
}
