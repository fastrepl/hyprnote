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
