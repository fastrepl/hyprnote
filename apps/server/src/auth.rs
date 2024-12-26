use axum::{
    extract::{Request, State},
    http::{header, StatusCode},
    middleware,
    response::Response,
};
use shuttle_clerk::clerk_rs::endpoints::ClerkDynamicGetEndpoint;

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

    let _user = state
        .clerk
        .get_with_params(ClerkDynamicGetEndpoint::GetUser, vec![auth_header])
        .await
        .map_err(|_| StatusCode::UNAUTHORIZED)?;

    if true {
        req.extensions_mut().insert(User {});
        Ok(next.run(req).await)
    } else {
        Err(StatusCode::UNAUTHORIZED)
    }
}
