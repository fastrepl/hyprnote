use stripe::{
    CheckoutSession, CheckoutSessionMode, Client, CreateCheckoutSession,
    CreateCheckoutSessionLineItems, CreateCheckoutSessionSubscriptionDataTrialSettings,
    CreateCheckoutSessionSubscriptionDataTrialSettingsEndBehavior,
    CreateCheckoutSessionSubscriptionDataTrialSettingsEndBehaviorMissingPaymentMethod,
    CreateCustomer, CreateSubscription, CreateSubscriptionTrialSettings,
    CreateSubscriptionTrialSettingsEndBehavior,
    CreateSubscriptionTrialSettingsEndBehaviorMissingPaymentMethod, Customer, CustomerId,
    Subscription,
};

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

    let success_url = get_success_url();
    params.success_url = Some(&success_url);

    CheckoutSession::create(client, params)
        .await
        .map_err(|e| e.to_string())
}

pub async fn create_subscription_with_trial(
    client: &Client,
    customer_id: CustomerId,
    trial_period_days: u32,
) -> Result<Subscription, String> {
    let mut params = CreateSubscription::new(customer_id);

    params.trial_settings = Some(trial_settings_for_subscription());
    params.trial_period_days = Some(trial_period_days);

    let subscription = Subscription::create(client, params)
        .await
        .map_err(|e| e.to_string())?;

    Ok(subscription)
}

pub async fn create_customer(client: &Client) -> Result<Customer, String> {
    let customer = Customer::create(client, CreateCustomer::default())
        .await
        .map_err(|e| e.to_string())?;

    Ok(customer)
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
pub fn get_price_id() -> String {
    "price_1RNJnZEABq1oJeLyqULb2gtm".to_string()
}

#[cfg(not(debug_assertions))]
pub fn get_price_id() -> String {
    "price_1RMxR4EABq1oJeLyOpEFuV2Q".to_string()
}

#[cfg(debug_assertions)]
fn get_success_url() -> String {
    "http://127.0.0.1:1234/checkout/success".to_string()
}

#[cfg(not(debug_assertions))]
fn get_success_url() -> String {
    "https://app.hyprnote.com/checkout/success".to_string()
}
