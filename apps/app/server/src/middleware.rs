use std::{future::Future, pin::Pin};

use axum::{
    extract::{Request, State},
    http::{header, StatusCode},
    middleware,
    response::Response,
    Extension,
};
use clerk_rs::validators::authorizer::ClerkJwt;

use crate::{
    get_env,
    state::{AnalyticsState, AuthState},
};

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
) -> Result<Response, StatusCode> {
    // https://clerk.com/docs/backend-requests/resources/session-tokens
    let clerk_user_id = jwt.sub;
    let clerk_org = jwt.org;

    if let Some(active_org) = clerk_org {
        let org = state
            .admin_db
            .get_organization_by_clerk_org_id(&active_org.id)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
            .ok_or(StatusCode::UNAUTHORIZED)?;

        req.extensions_mut().insert(org);
    }

    {
        let user = state
            .admin_db
            .get_user_by_clerk_user_id(clerk_user_id)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
            .ok_or(StatusCode::UNAUTHORIZED)?;

        req.extensions_mut().insert(user);
    }

    Ok(next.run(req).await)
}

#[tracing::instrument(skip_all)]
pub async fn attach_user_db(
    Extension(org): Extension<hypr_db::admin::Organization>,
    mut req: Request,
    next: middleware::Next,
) -> Result<Response, StatusCode> {
    let conn = {
        #[cfg(debug_assertions)]
        {
            let token = get_env("TURSO_API_KEY");
            let url = format!("{}-yujonglee.turso.io", org.turso_db_name);
            hypr_db::ConnectionBuilder::new().remote(url, token)
        }

        #[cfg(not(debug_assertions))]
        {
            hypr_db::ConnectionBuilder::new().local()
        }
    }
    .connect()
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let db = hypr_db::user::UserDatabase::from(conn);

    req.extensions_mut().insert(db);
    Ok(next.run(req).await)
}

#[tracing::instrument(skip_all)]
pub async fn send_analytics(
    Extension(user): Extension<hypr_db::admin::User>,
    State(state): State<AnalyticsState>,
    req: Request,
    next: middleware::Next,
) -> Result<Response, StatusCode> {
    let payload = hypr_analytics::AnalyticsPayload::for_user(user.id.to_string())
        .event("test_event")
        .with("url", req.uri().path().to_string())
        .build();

    let _ = state.analytics.event(payload).await;

    Ok(next.run(req).await)
}

pub fn check_membership(
    _membership: String,
) -> impl Fn(
    State<AuthState>,
    Extension<hypr_db::admin::User>,
    Request,
    middleware::Next,
) -> Pin<Box<dyn Future<Output = Result<Response, StatusCode>> + Send>>
       + Clone {
    move |State(_state): State<AuthState>,
          Extension(_user): Extension<hypr_db::admin::User>,
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
