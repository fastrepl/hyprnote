use axum::{
    extract::{Request, State},
    http::{header, StatusCode},
    middleware,
    response::Response,
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

    let api_key = if let Some(api_key) = auth_header {
        api_key
    } else {
        return Err(StatusCode::UNAUTHORIZED);
    };

    let user = state
        .admin_db
        .get_user_by_device_api_key(api_key)
        .await
        .map_err(|_| StatusCode::UNAUTHORIZED)?;

    // let _user = state
    //     .clerk
    //     .get_with_params(ClerkDynamicGetEndpoint::GetUser, vec![&user.clerk_user_id])
    //     .await
    //     .map_err(|_| StatusCode::UNAUTHORIZED)?;

    if true {
        req.extensions_mut().insert(user);
        Ok(next.run(req).await)
    } else {
        Err(StatusCode::UNAUTHORIZED)
    }
}
