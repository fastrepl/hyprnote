use axum::{Extension, Json, extract::State};
use serde::Serialize;
use utoipa::ToSchema;

use crate::error::Result;
use crate::state::AppState;

use hypr_api_auth::AuthContext;

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct CanStartTrialResponse {
    #[schema(example = true)]
    pub can_start_trial: bool,
}

#[utoipa::path(
    get,
    path = "/can-start-trial",
    responses(
        (status = 200, description = "Check successful", body = CanStartTrialResponse),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error"),
    ),
    tag = "subscription",
)]
pub async fn can_start_trial(
    State(state): State<AppState>,
    Extension(auth): Extension<AuthContext>,
) -> Result<Json<CanStartTrialResponse>> {
    let can_start: bool = state
        .supabase
        .rpc("can_start_trial", &auth.token, None)
        .await
        .unwrap_or(false);

    Ok(Json(CanStartTrialResponse {
        can_start_trial: can_start,
    }))
}
