/// Subscription status enumeration based on Stripe's subscription model.
///
/// See: <https://docs.stripe.com/api/subscriptions/object#subscription_object-status>
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum SubscriptionStatus {
    /// Subscription is incomplete and requires payment method setup.
    Incomplete,
    /// Subscription was incomplete and has expired.
    IncompleteExpired,
    /// Subscription is in trial period.
    Trialing,
    /// Subscription is active and in good standing.
    Active,
    /// Payment is past due but subscription is still active.
    PastDue,
    /// Subscription has been canceled.
    Canceled,
    /// Subscription is unpaid and no longer active.
    Unpaid,
    /// Subscription is temporarily paused.
    Paused,
}
