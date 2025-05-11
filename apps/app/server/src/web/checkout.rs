use axum::{
    extract::{Extension, State},
    http::StatusCode,
};

use clerk_rs::validators::authorizer::ClerkJwt;

use crate::{state::AppState, stripe_mod::ops as stripe_ops};

pub async fn handler(
    State(state): State<AppState>,
    Extension(jwt): Extension<ClerkJwt>,
) -> Result<String, (StatusCode, String)> {
    let (clerk_user_id, clerk_org_id) = (jwt.sub, jwt.org.map(|o| o.id));

    let account = {
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
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or((StatusCode::UNAUTHORIZED, "account_not_found".to_string()))?;

    let billing = state
        .admin_db
        .get_billing_by_account_id(&account.id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let customer_id = match billing.and_then(|b| b.stripe_customer) {
        Some(c) => c.id,
        None => {
            let c = stripe_ops::create_customer(&state.stripe)
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

            c.id
        }
    };

    let checkout_session = stripe_ops::create_checkout_without_trial(&state.stripe, customer_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(checkout_session.url.unwrap())
}
