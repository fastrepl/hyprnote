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

    let nango_integrations = integrations
        .into_iter()
        .map(|i| i.nango_integration_id)
        .collect::<Vec<_>>();

    Ok(Json(nango_integrations))
}

pub async fn checkout_url(
    State(state): State<AppState>,
    Extension(user): Extension<hypr_db::admin::User>,
) -> Result<impl IntoResponse, StatusCode> {
    let customer = state
        .admin_db
        .get_customer_by_user_id(user.id)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let req = hypr_lago::customer::regenerate_checkout_url::Request {
        external_customer_id: customer.id.to_string(),
    };

    let res = state
        .lago
        .regenerate_checkout_url(req)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(res))
}
