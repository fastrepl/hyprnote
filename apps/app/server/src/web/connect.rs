use axum::{
    extract::{Extension, State},
    http::StatusCode,
    Json,
};
use clerk_rs::validators::authorizer::ClerkJwt;

use crate::{state::AppState, stripe_mod::ops as stripe_ops};
use hypr_auth_interface::{RequestParams, ResponseParams};

pub async fn handler(
    State(state): State<AppState>,
    Extension(jwt): Extension<ClerkJwt>,
    Json(input): Json<RequestParams>,
) -> Result<Json<ResponseParams>, (StatusCode, String)> {
    let (clerk_user_id, clerk_org_id) = (jwt.sub, jwt.org.map(|o| o.id));

    let existing_account = {
        if let Some(clerk_org_id) = &clerk_org_id {
            state
                .admin_db
                .get_account_by_clerk_org_id(clerk_org_id)
                .await
        } else {
            state
                .admin_db
                .get_account_by_clerk_user_id(&clerk_user_id)
                .await
        }
    }
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let account = {
        if existing_account.is_some() {
            Ok(existing_account.clone().unwrap())
        } else {
            let db = state.admin_db.clone();

            let account_id = uuid::Uuid::new_v4().to_string();

            // make sure we use same format in tauri side
            let turso_db_name = hypr_turso::format_db_name(account_id.clone());

            let customer = stripe_ops::create_customer(&state.stripe).await.unwrap();
            let subscription =
                stripe_ops::create_subscription_with_trial(&state.stripe, customer.id.clone(), 7)
                    .await
                    .unwrap();

            let _ = db
                .create_billing(&account_id, customer, subscription)
                .await
                .unwrap();

            db.upsert_account(hypr_db_admin::Account {
                id: account_id,
                turso_db_name,
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
            db.upsert_user(hypr_db_admin::User {
                id: uuid::Uuid::new_v4().to_string(),
                account_id: account.id.clone(),
                human_id: uuid::Uuid::new_v4().to_string(),
                timestamp: chrono::Utc::now(),
                clerk_user_id,
            })
            .await
        }
    }
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let _ = {
        if existing_account.is_none() {
            let create_db_req = hypr_turso::CreateDatabaseRequestBuilder::default()
                .with_name(&account.turso_db_name)
                .build();

            match state.turso.create_database(create_db_req).await {
                Ok(db) => Ok(db.name),
                Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
            }
        } else {
            Ok(existing_account.unwrap().turso_db_name)
        }
    }?;

    let device = match state
        .admin_db
        .upsert_device(hypr_db_admin::Device {
            id: uuid::Uuid::new_v4().to_string(),
            user_id: user.id,
            timestamp: chrono::Utc::now(),
            fingerprint: input.fingerprint,
            api_key: uuid::Uuid::new_v4().to_string(),
        })
        .await
    {
        Ok(device) => device,
        Err(error) => {
            return Err::<Json<ResponseParams>, (StatusCode, String)>((
                StatusCode::INTERNAL_SERVER_ERROR,
                error.to_string(),
            ));
        }
    };

    let database_token = state
        .turso
        .generate_db_token(&account.turso_db_name)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(ResponseParams {
        user_id: user.human_id,
        account_id: account.id,
        server_token: device.api_key.clone(),
        database_token,
    }))
}
