use axum::{
    extract::{Extension, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};

use crate::state::AppState;
use shuttle_clerk::clerk_rs::validators::authorizer::ClerkJwt;

#[derive(Debug, Deserialize, Serialize)]
pub struct Input {}

#[derive(Debug, Deserialize, Serialize)]
pub struct Output {}

pub async fn handler(
    State(state): State<AppState>,
    Extension(jwt): Extension<ClerkJwt>,
    Json(input): Json<Input>,
) -> Result<impl IntoResponse, StatusCode> {
    let clerk_user_id = jwt.sub;
    Ok(Json(Output {}))
}
