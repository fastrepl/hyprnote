use axum::{
    Json,
    extract::{Query, State},
    http::HeaderMap,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use stripe_billing::subscription::{
    CreateSubscription, CreateSubscriptionItems, CreateSubscriptionTrialSettings,
    CreateSubscriptionTrialSettingsEndBehavior,
    CreateSubscriptionTrialSettingsEndBehaviorMissingPaymentMethod,
};
use stripe_core::customer::CreateCustomer;

use crate::error::{Result, SubscriptionError};
use crate::routes::rpc::extract_token;
use crate::state::AppState;

#[derive(Debug, Deserialize)]
pub struct StartTrialQuery {
    #[serde(default = "default_interval")]
    interval: Interval,
}

fn default_interval() -> Interval {
    Interval::Monthly
}

#[derive(Debug, Deserialize, Clone, Copy)]
#[serde(rename_all = "lowercase")]
pub enum Interval {
    Monthly,
    Yearly,
}

#[derive(Debug, Serialize)]
pub struct StartTrialResponse {
    started: bool,
}

#[derive(Debug, Deserialize)]
struct Profile {
    stripe_customer_id: Option<String>,
}

pub async fn start_trial(
    State(state): State<AppState>,
    Query(query): Query<StartTrialQuery>,
    headers: HeaderMap,
) -> Result<Json<StartTrialResponse>> {
    let auth_token = extract_token(&headers)?;

    let auth = state
        .config
        .auth
        .as_ref()
        .ok_or_else(|| SubscriptionError::Auth("Auth not configured".to_string()))?;

    let claims = auth
        .verify_token(auth_token)
        .await
        .map_err(|e| SubscriptionError::Auth(e.to_string()))?;
    let user_id = claims.sub;

    let can_start: bool = state
        .supabase
        .rpc("can_start_trial", auth_token, None)
        .await?;

    if !can_start {
        return Ok(Json(StartTrialResponse { started: false }));
    }

    let customer_id = get_or_create_customer(&state, auth_token, &user_id).await?;

    let price_id = match query.interval {
        Interval::Monthly => &state.config.stripe_monthly_price_id,
        Interval::Yearly => &state.config.stripe_yearly_price_id,
    };

    create_trial_subscription(&state.stripe, &customer_id, price_id, &user_id).await?;

    Ok(Json(StartTrialResponse { started: true }))
}

async fn get_or_create_customer(
    state: &AppState,
    auth_token: &str,
    user_id: &str,
) -> Result<String> {
    let profiles: Vec<Profile> = state
        .supabase
        .select(
            "profiles",
            auth_token,
            "stripe_customer_id",
            &[("id", &format!("eq.{}", user_id))],
        )
        .await?;

    if let Some(profile) = profiles.first() {
        if let Some(customer_id) = &profile.stripe_customer_id {
            return Ok(customer_id.clone());
        }
    }

    let email = state.supabase.get_user_email(auth_token).await?;

    let metadata: HashMap<String, String> = [("userId".to_string(), user_id.to_string())].into();

    let mut create_customer = CreateCustomer::new().metadata(metadata);

    if let Some(ref email_str) = email {
        create_customer = create_customer.email(email_str);
    }

    let customer = create_customer
        .send(&state.stripe)
        .await
        .map_err(|e| SubscriptionError::Stripe(e.to_string()))?;

    #[derive(Serialize)]
    struct UpdateData {
        stripe_customer_id: String,
    }

    state
        .supabase
        .update(
            "profiles",
            auth_token,
            &[
                ("id", &format!("eq.{}", user_id)),
                ("stripe_customer_id", "is.null"),
            ],
            &UpdateData {
                stripe_customer_id: customer.id.to_string(),
            },
        )
        .await?;

    Ok(customer.id.to_string())
}

async fn create_trial_subscription(
    stripe: &stripe::Client,
    customer_id: &str,
    price_id: &str,
    _user_id: &str,
) -> Result<()> {
    let mut item = CreateSubscriptionItems::new();
    item.price = Some(price_id.to_string());

    let create_sub = CreateSubscription::new()
        .customer(customer_id)
        .items(vec![item])
        .trial_period_days(14u32)
        .trial_settings(CreateSubscriptionTrialSettings::new(
            CreateSubscriptionTrialSettingsEndBehavior::new(
                CreateSubscriptionTrialSettingsEndBehaviorMissingPaymentMethod::Cancel,
            ),
        ));

    create_sub
        .send(stripe)
        .await
        .map_err(|e| SubscriptionError::Stripe(e.to_string()))?;

    Ok(())
}
