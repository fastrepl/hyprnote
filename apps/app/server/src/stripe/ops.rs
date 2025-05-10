use stripe::{
    CheckoutSession, CheckoutSessionMode, Client, CreateCheckoutSession,
    CreateCheckoutSessionLineItems, CreateCheckoutSessionSubscriptionDataTrialSettings,
    CreateCheckoutSessionSubscriptionDataTrialSettingsEndBehavior,
    CreateCheckoutSessionSubscriptionDataTrialSettingsEndBehaviorMissingPaymentMethod,
    CreateSubscription, CreateSubscriptionTrialSettings,
    CreateSubscriptionTrialSettingsEndBehavior,
    CreateSubscriptionTrialSettingsEndBehaviorMissingPaymentMethod, CustomerId, Subscription,
};

#[cfg(debug_assertions)]
pub fn get_price_id() -> String {
    "price_1PZ00000000000000000000".to_string()
}

#[cfg(not(debug_assertions))]
pub fn get_price_id() -> String {
    "price_1PZ00000000000000000000".to_string()
}

pub fn get_line_items() -> Vec<CreateCheckoutSessionLineItems> {
    vec![CreateCheckoutSessionLineItems {
        quantity: Some(1),
        price: Some(get_price_id()),
        ..Default::default()
    }]
}

pub async fn create_checkout_without_trial(
    client: &Client,
    customer_id: CustomerId,
) -> Result<CheckoutSession, String> {
    let mut params = CreateCheckoutSession::new();
    params.customer = Some(customer_id);
    params.mode = Some(CheckoutSessionMode::Subscription);
    params.line_items = Some(get_line_items());

    let cancel_url = get_cancel_url();
    let success_url = get_success_url();
    params.cancel_url = Some(&cancel_url);
    params.success_url = Some(&success_url);

    CheckoutSession::create(client, params)
        .await
        .map_err(|e| e.to_string())
}

pub async fn create_subscription_with_trial(
    client: &Client,
    customer_id: CustomerId,
) -> Result<Subscription, String> {
    let mut params = CreateSubscription::new(customer_id);

    params.trial_settings = Some(CreateSubscriptionTrialSettings {
        end_behavior: CreateSubscriptionTrialSettingsEndBehavior {
            missing_payment_method:
                CreateSubscriptionTrialSettingsEndBehaviorMissingPaymentMethod::Cancel,
        },
    });
    params.trial_period_days = Some(7);

    let subscription = Subscription::create(client, params)
        .await
        .map_err(|e| e.to_string())?;

    Ok(subscription)
}

// https://docs.stripe.com/billing/subscriptions/trials#create-free-trials-without-payment
fn trial_settings_for_subscription() -> CreateSubscriptionTrialSettings {
    CreateSubscriptionTrialSettings {
        end_behavior: CreateSubscriptionTrialSettingsEndBehavior {
            missing_payment_method:
                CreateSubscriptionTrialSettingsEndBehaviorMissingPaymentMethod::Cancel,
        },
    }
}

#[allow(dead_code)]
fn trial_settings_for_checkout() -> CreateCheckoutSessionSubscriptionDataTrialSettings {
    CreateCheckoutSessionSubscriptionDataTrialSettings {
        end_behavior: CreateCheckoutSessionSubscriptionDataTrialSettingsEndBehavior {
            missing_payment_method: CreateCheckoutSessionSubscriptionDataTrialSettingsEndBehaviorMissingPaymentMethod::Cancel,
        },
    }
}

#[cfg(debug_assertions)]
fn get_cancel_url() -> String {
    "http://test.com/cancel".to_string()
}

#[cfg(not(debug_assertions))]
fn get_cancel_url() -> String {
    "http://test.com/cancel".to_string()
}

#[cfg(debug_assertions)]
fn get_success_url() -> String {
    "http://test.com/success".to_string()
}

#[cfg(not(debug_assertions))]
fn get_success_url() -> String {
    "http://test.com/success".to_string()
}
