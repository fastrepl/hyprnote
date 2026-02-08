use axum::{
    Extension, Json,
    extract::{Query, State},
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use stripe::StripeRequest;
use stripe_billing::subscription::{
    CreateSubscription, CreateSubscriptionItems, CreateSubscriptionTrialSettings,
    CreateSubscriptionTrialSettingsEndBehavior,
    CreateSubscriptionTrialSettingsEndBehaviorMissingPaymentMethod,
};
use stripe_core::customer::CreateCustomer;
use utoipa::{IntoParams, ToSchema};

use hypr_api_auth::AuthContext;

use crate::error::{Result, SubscriptionError};
use crate::state::AppState;

#[derive(Debug, Deserialize, IntoParams)]
pub struct StartTrialQuery {
    #[serde(default = "default_interval")]
    #[param(example = "monthly")]
    pub interval: Interval,
}

fn default_interval() -> Interval {
    Interval::Monthly
}

#[derive(Debug, Deserialize, Clone, Copy, ToSchema)]
#[serde(rename_all = "lowercase")]
pub enum Interval {
    Monthly,
    Yearly,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct StartTrialResponse {
    #[schema(example = true)]
    pub started: bool,
}

#[derive(Debug, Deserialize)]
struct Profile {
    stripe_customer_id: Option<String>,
}

#[utoipa::path(
    post,
    path = "/subscription/start-trial",
    params(StartTrialQuery),
    responses(
        (status = 200, description = "Trial started successfully", body = StartTrialResponse),
        (status = 401, description = "Unauthorized"),
        (status = 500, description = "Internal server error"),
    ),
    tag = "subscription",
    security(
        ("bearer_auth" = [])
    )
)]
pub async fn start_trial(
    State(state): State<AppState>,
    Query(query): Query<StartTrialQuery>,
    Extension(auth): Extension<AuthContext>,
) -> Result<Json<StartTrialResponse>> {
    let user_id = &auth.claims.sub;

    let can_start: bool = state
        .supabase
        .rpc("can_start_trial", &auth.token, None)
        .await?;

    if !can_start {
        return Ok(Json(StartTrialResponse { started: false }));
    }

    let customer_id = get_or_create_customer(&state, &auth.token, user_id).await?;

    let customer_id = customer_id
        .ok_or_else(|| SubscriptionError::Internal("stripe_customer_id_missing".to_string()))?;

    let price_id = match query.interval {
        Interval::Monthly => &state.config.stripe_monthly_price_id,
        Interval::Yearly => &state.config.stripe_yearly_price_id,
    };

    create_trial_subscription(&state.stripe, &customer_id, price_id, user_id).await?;

    Ok(Json(StartTrialResponse { started: true }))
}

async fn get_or_create_customer(
    state: &AppState,
    auth_token: &str,
    user_id: &str,
) -> Result<Option<String>> {
    let profiles: Vec<Profile> = state
        .supabase
        .select(
            "profiles",
            auth_token,
            "stripe_customer_id",
            &[("id", &format!("eq.{}", user_id))],
        )
        .await?;

    if let Some(profile) = profiles.first()
        && let Some(customer_id) = &profile.stripe_customer_id
    {
        return Ok(Some(customer_id.clone()));
    }

    let email = state.supabase.get_user_email(auth_token).await?;

    let metadata: HashMap<String, String> = [("userId".to_string(), user_id.to_string())].into();

    let mut create_customer = CreateCustomer::new().metadata(metadata);

    if let Some(ref email_str) = email {
        create_customer = create_customer.email(email_str);
    }

    let idempotency_key: stripe::IdempotencyKey = format!("create-customer-{}", user_id)
        .try_into()
        .map_err(|e: stripe::IdempotentKeyError| SubscriptionError::Internal(e.to_string()))?;
    let customer = create_customer
        .customize()
        .request_strategy(stripe::RequestStrategy::Idempotent(idempotency_key))
        .send(&state.stripe)
        .await
        .map_err(|e: stripe::StripeError| SubscriptionError::Stripe(e.to_string()))?;

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

    let updated_profiles: Vec<Profile> = state
        .supabase
        .select(
            "profiles",
            auth_token,
            "stripe_customer_id",
            &[("id", &format!("eq.{}", user_id))],
        )
        .await?;

    Ok(updated_profiles
        .first()
        .and_then(|p| p.stripe_customer_id.clone()))
}

async fn create_trial_subscription(
    stripe: &stripe::Client,
    customer_id: &str,
    price_id: &str,
    user_id: &str,
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

    let date = Utc::now().format("%Y-%m-%d").to_string();
    let idempotency_key: stripe::IdempotencyKey = format!("trial-{}-{}", user_id, date)
        .try_into()
        .map_err(|e: stripe::IdempotentKeyError| SubscriptionError::Internal(e.to_string()))?;

    create_sub
        .customize()
        .request_strategy(stripe::RequestStrategy::Idempotent(idempotency_key))
        .send(stripe)
        .await
        .map_err(|e: stripe::StripeError| SubscriptionError::Stripe(e.to_string()))?;

    Ok(())
}
