use axum::{extract::State, http::StatusCode, Extension, Json};
use hypr_nango::NangoIntegration;

use crate::state::AppState;

pub async fn list_integrations(
    State(state): State<AppState>,
    Extension(user): Extension<hypr_db_admin::User>,
) -> Result<Json<Vec<NangoIntegration>>, StatusCode> {
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
