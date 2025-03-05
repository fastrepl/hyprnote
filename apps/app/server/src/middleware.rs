use std::{future::Future, pin::Pin};

use axum::{
    extract::{Request, State},
    http::{header, StatusCode},
    middleware,
    response::Response,
    Extension,
};
use clerk_rs::validators::authorizer::ClerkJwt;

use crate::state::{AnalyticsState, AuthState};

#[tracing::instrument(skip_all)]
pub async fn verify_api_key(
    State(state): State<AuthState>,
    mut req: Request,
    next: middleware::Next,
) -> Result<Response, StatusCode> {
    let auth_header = req
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|header| header.to_str().ok());

    let api_key = if let Some(v) = auth_header {
        v.strip_prefix("Bearer ").unwrap_or(v)
    } else {
        return Err(StatusCode::UNAUTHORIZED);
    };

    let user = state
        .admin_db
        .get_user_by_device_api_key(api_key)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::UNAUTHORIZED)?;

    req.extensions_mut().insert(user);
    Ok(next.run(req).await)
}

#[tracing::instrument(skip_all)]
pub async fn attach_user_from_clerk(
    State(state): State<AuthState>,
    Extension(jwt): Extension<ClerkJwt>,
    mut req: Request,
    next: middleware::Next,
) -> Result<Response, (StatusCode, String)> {
    // https://clerk.com/docs/backend-requests/resources/session-tokens
    let clerk_user_id = jwt.sub;
    let clerk_org_id = jwt.org.map(|o| o.id);

    let user = state
        .admin_db
        .get_user_by_clerk_user_id(clerk_user_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::UNAUTHORIZED, "user_not_found".into()))?;

    let accounts = state
        .admin_db
        .list_accounts_by_user_id(user.id.clone())
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let account = accounts
        .into_iter()
        .find(|org| org.clerk_org_id == clerk_org_id)
        .ok_or((StatusCode::UNPROCESSABLE_ENTITY, "account_not_found".into()))?;

    req.extensions_mut().insert(user);
    req.extensions_mut().insert(account);
    Ok(next.run(req).await)
}

#[tracing::instrument(skip_all)]
pub async fn attach_user_db(
    State(state): State<AuthState>,
    #[allow(unused)] Extension(account): Extension<hypr_db_admin::Account>,
    mut req: Request,
    next: middleware::Next,
) -> Result<Response, (StatusCode, String)> {
    let token = state
        .turso
        .generate_db_token(&account.turso_db_name)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let base_db = {
        let url = state.turso.format_db_url(&account.turso_db_name);
        hypr_db_core::DatabaseBuilder::default()
            .remote(url, token)
            .build()
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    };

    let user_db = hypr_db_user::UserDatabase::from(base_db);

    req.extensions_mut().insert(user_db);
    Ok(next.run(req).await)
}

#[tracing::instrument(skip_all)]
pub async fn send_analytics(
    Extension(user): Extension<hypr_db_admin::User>,
    Extension(account): Extension<hypr_db_admin::Account>,
    State(state): State<AnalyticsState>,
    req: Request,
    next: middleware::Next,
) -> Result<Response, StatusCode> {
    let payload = hypr_analytics::AnalyticsPayload::for_user(user.id.to_string())
        .event("request")
        .with("url", req.uri().path().to_string())
        .with("account_id", account.id.to_string())
        .build();

    if cfg!(debug_assertions) {
        let _ = state.analytics.event(payload).await;
    }

    Ok(next.run(req).await)
}

#[allow(unused)]
type MiddlewareHandler = Pin<Box<dyn Future<Output = Result<Response, StatusCode>> + Send>>;

#[tracing::instrument(skip_all)]
pub fn check_membership(
    _membership: String,
) -> impl Fn(
    State<AuthState>,
    Extension<hypr_db_admin::User>,
    Request,
    middleware::Next,
) -> MiddlewareHandler
       + Clone {
    move |State(_state): State<AuthState>,
          Extension(_user): Extension<hypr_db_admin::User>,
          req: Request,
          next: middleware::Next| {
        Box::pin(async move {
            // TODO
            if false {
                return Err(StatusCode::PAYMENT_REQUIRED);
            }

            Ok(next.run(req).await)
        })
    }
}
