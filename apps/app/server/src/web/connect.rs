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
    human_id: String,
}

pub async fn handler(
    State(state): State<AppState>,
    Extension(jwt): Extension<ClerkJwt>,
    Json(input): Json<ConnectInput>,
) -> Result<Json<ConnectOutput>, (StatusCode, String)> {
    let clerk_user_id = jwt.sub;
    let clerk_org_id = jwt.org.map(|o| o.id);

    let existing_org = {
        let db = state.admin_db.clone();

        if let Some(clerk_org_id) = &clerk_org_id {
            db.get_organization_by_clerk_org_id(clerk_org_id).await
        } else {
            db.get_organization_by_clerk_user_id(&clerk_user_id).await
        }
    }
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let org = {
        if existing_org.is_some() {
            Ok(existing_org.clone().unwrap())
        } else {
            let db = state.admin_db.clone();
            db.upsert_organization(hypr_db::admin::Organization {
                id: uuid::Uuid::new_v4().to_string(),
                turso_db_name: uuid::Uuid::new_v4().to_string(),
                clerk_org_id,
            })
            .await
        }
    }
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let existing_user = {
        let db = state.admin_db.clone();
        db.get_user_by_clerk_user_id(&clerk_user_id).await
    }
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let user = {
        if let Some(u) = existing_user {
            Ok(u)
        } else {
            let db = state.admin_db.clone();
            db.upsert_user(hypr_db::admin::User {
                id: uuid::Uuid::new_v4().to_string(),
                human_id: uuid::Uuid::new_v4().to_string(),
                organization_id: org.id,
                timestamp: chrono::Utc::now(),
                clerk_user_id,
            })
            .await
        }
    }
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let _ = {
        if existing_org.is_none() {
            let create_db_req = hypr_turso::CreateDatabaseRequestBuilder::default()
                .with_name(org.turso_db_name)
                .build();

            match state.turso.create_database(create_db_req).await {
                Ok(hypr_turso::DatabaseResponse::Error { error }) => {
                    Err((StatusCode::INTERNAL_SERVER_ERROR, error.to_string()))
                }
                Err(error) => Err((StatusCode::INTERNAL_SERVER_ERROR, error.to_string())),
                Ok(hypr_turso::DatabaseResponse::Ok { database }) => Ok(database.name),
            }
        } else {
            Ok(existing_org.unwrap().turso_db_name)
        }
    }?;

    let user_id = user.id;
    let human_id = user.human_id;

    let device = match state
        .admin_db
        .upsert_device(hypr_db::admin::Device {
            id: uuid::Uuid::new_v4().to_string(),
            user_id,
            timestamp: chrono::Utc::now(),
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
        human_id,
    }))
}
