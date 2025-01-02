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
    #[serde(rename = "c")]
    code: String,
    #[serde(rename = "f")]
    fingerprint: String,
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

    let create_db_req = hypr_turso::CreateDatabaseRequestBuilder::new()
        .with_group(
            #[cfg(debug_assertions)]
            hypr_turso::DatabaseGroup::HyprnoteDev,
            #[cfg(not(debug_assertions))]
            hypr_turso::DatabaseGroup::HyprnoteProd,
        )
        .with_name(format!("hyprnote_{}", clerk_user_id))
        .build();

    let create_db_res = state
        .turso
        .create_database(create_db_req)
        .await
        .map_err(|_e| StatusCode::INTERNAL_SERVER_ERROR)?;

    let turso_db_name = match create_db_res {
        hypr_turso::DatabaseResponse::Database { database } => database.name,
        _ => return Err(StatusCode::INTERNAL_SERVER_ERROR),
    };

    let _user = state
        .admin_db
        .create_user(hypr_db::admin::User {
            clerk_user_id,
            turso_db_name,
            ..Default::default()
        })
        .await
        .map_err(|_e| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(Output { code: input.code }))
}
