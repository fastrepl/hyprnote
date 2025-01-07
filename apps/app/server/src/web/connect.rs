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
    key: String,
}

pub async fn handler(
    State(state): State<AppState>,
    Extension(jwt): Extension<ClerkJwt>,
    Json(input): Json<Input>,
) -> impl IntoResponse {
    let clerk_user_id = jwt.sub;

    let create_db_req = hypr_turso::CreateDatabaseRequestBuilder::new()
        .with_name(uuid::Uuid::new_v4().to_string())
        .build();

    let turso_db_name = match state.turso.create_database(create_db_req).await {
        Ok(hypr_turso::DatabaseResponse::Database { database }) => database.name,
        Ok(hypr_turso::DatabaseResponse::Error { error }) => {
            return Err((StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))
        }
        Err(error) => return Err((StatusCode::INTERNAL_SERVER_ERROR, error.to_string())),
    };

    let user = match state
        .admin_db
        .upsert_user(hypr_db::admin::User {
            clerk_user_id,
            turso_db_name,
            ..Default::default()
        })
        .await
    {
        Ok(user) => user,
        Err(error) => return Err((StatusCode::INTERNAL_SERVER_ERROR, error.to_string())),
    };

    let device = match state
        .admin_db
        .upsert_device(hypr_db::admin::Device {
            id: uuid::Uuid::new_v4().to_string(),
            user_id: user.id,
            timestamp: time::OffsetDateTime::now_utc(),
            fingerprint: input.fingerprint,
            api_key: uuid::Uuid::new_v4().to_string(),
        })
        .await
    {
        Ok(device) => device,
        Err(error) => return Err((StatusCode::INTERNAL_SERVER_ERROR, error.to_string())),
    };

    Ok(Json(Output {
        key: device.api_key,
    }))
}
