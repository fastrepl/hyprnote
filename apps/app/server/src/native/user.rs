use axum::{extract::State, http::StatusCode, response::IntoResponse, Extension, Json};

use crate::state::AppState;

pub async fn list_integrations(
    State(state): State<AppState>,
    Extension(user): Extension<hypr_db::admin::User>,
) -> Result<impl IntoResponse, StatusCode> {
    let integrations = state
        .admin_db
        .list_integrations(user.id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(integrations))
}

pub async fn checkout_url(
    State(state): State<AppState>,
    Extension(user): Extension<hypr_db::admin::User>,
) -> Result<impl IntoResponse, StatusCode> {
    let req = hypr_lago::customer::regenerate_checkout_url::Request {
        external_customer_id: user.id.to_string(),
    };

    let res = state
        .lago
        .regenerate_checkout_url(req)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(res))
}
