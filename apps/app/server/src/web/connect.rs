use axum::{
    extract::{Extension, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};

use crate::state::AppState;
use clerk_rs::validators::authorizer::ClerkJwt;

#[derive(Debug, Deserialize, Serialize, specta::Type, schemars::JsonSchema)]
pub struct ConnectInput {
    code: String,
    fingerprint: String,
    org_id: Option<String>,
    user_id: String,
}

#[derive(Debug, Deserialize, Serialize, specta::Type, schemars::JsonSchema)]
pub struct ConnectOutput {
    key: String,
}

pub async fn handler(
    State(state): State<AppState>,
    Extension(jwt): Extension<ClerkJwt>,
    Json(input): Json<ConnectInput>,
) -> Result<Json<ConnectOutput>, (StatusCode, String)> {
    let clerk_user_id = jwt.sub;

    let create_db_req = hypr_turso::CreateDatabaseRequestBuilder::new()
        .with_name(uuid::Uuid::new_v4().to_string())
        .build();

    let turso_db_name = match state.turso.create_database(create_db_req).await {
        Ok(hypr_turso::DatabaseResponse::Ok { database }) => database.name,
        Ok(hypr_turso::DatabaseResponse::Error { error }) => {
            return Err((StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))
        }
        Err(error) => return Err((StatusCode::INTERNAL_SERVER_ERROR, error.to_string())),
    };

    let user = match state
        .admin_db
        .upsert_user(hypr_db::admin::User {
            id: uuid::Uuid::new_v4().to_string(),
            timestamp: time::OffsetDateTime::now_utc(),
            clerk_org_id: input.org_id,
            clerk_user_id,
            turso_db_name,
        })
        .await
    {
        Ok(user) => user,
        Err(error) => {
            return Err((StatusCode::INTERNAL_SERVER_ERROR, error.to_string()));
        }
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
        Err(error) => {
            return Err::<Json<ConnectOutput>, (StatusCode, String)>((
                StatusCode::INTERNAL_SERVER_ERROR,
                error.to_string(),
            ));
        }
    };

    Ok(Json(ConnectOutput {
        key: device.api_key,
    }))
}
