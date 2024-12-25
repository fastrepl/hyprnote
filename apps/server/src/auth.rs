use axum::{
    extract::Request,
    http::StatusCode,
    middleware,
    response::{IntoResponse, Response},
};

pub async fn middleware_fn(req: Request, next: middleware::Next) -> Result<Response, StatusCode> {
    if req.headers().get("Authorization").unwrap() != "Bearer 1234567890" {
        return Err(StatusCode::UNAUTHORIZED);
    }

    Ok(next.run(req).await)
}

pub async fn oauth_login_handler() -> impl IntoResponse {}
