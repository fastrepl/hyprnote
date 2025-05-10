use axum::{
    extract::{Extension, State},
    http::StatusCode,
};

use clerk_rs::validators::authorizer::ClerkJwt;
use stripe::{
    CheckoutSession, CheckoutSessionMode, CreateCheckoutSession, CreateCheckoutSessionLineItems,
    CreateCustomer, Customer,
};

use crate::state::AppState;

const PRICE_ID: &str = "price_1PZ00000000000000000000";

pub async fn handler(
    State(state): State<AppState>,
    Extension(jwt): Extension<ClerkJwt>,
) -> Result<String, (StatusCode, String)> {
    let account = state
        .admin_db
        .get_account_by_clerk_user_id(&jwt.sub)
        .await
        .unwrap()
        .unwrap();

    let billing = state
        .admin_db
        .get_billing_by_account_id(&account.id)
        .await
        .unwrap();

    let customer_id = match billing.and_then(|b| b.stripe_customer) {
        Some(c) => c.id,
        None => {
            let c = Customer::create(&state.stripe, CreateCustomer::default())
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

            c.id
        }
    };

    let checkout_session = {
        let mut params = CreateCheckoutSession::new();
        params.cancel_url = Some("http://test.com/cancel");
        params.success_url = Some("http://test.com/success");
        params.customer = Some(customer_id);
        params.mode = Some(CheckoutSessionMode::Subscription);
        params.line_items = Some(vec![CreateCheckoutSessionLineItems {
            quantity: Some(1),
            price: Some(PRICE_ID.to_string()),
            ..Default::default()
        }]);

        CheckoutSession::create(&state.stripe, params).await?
    };

    Ok(checkout_session.url.unwrap())
}
