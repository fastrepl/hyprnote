use axum::{
    extract::{Extension, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};

use crate::state::AppState;
use clerk_rs::validators::authorizer::ClerkJwt;

#[derive(Debug, Deserialize, Serialize)]
pub struct Input {
    code: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct Output {
    code: String,
}

pub async fn handler(
    State(state): State<AppState>,
    Extension(jwt): Extension<ClerkJwt>,
    Json(input): Json<Input>,
) -> Result<impl IntoResponse, StatusCode> {
    let clerk_user_id = jwt.sub;
    println!("clerk_user_id: {}", clerk_user_id);
    Ok(Json(Output { code: input.code }))
}
