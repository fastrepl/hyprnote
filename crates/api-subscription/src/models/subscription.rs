use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// Subscription billing interval
#[derive(Debug, Deserialize, Serialize, Clone, Copy, ToSchema)]
#[serde(rename_all = "lowercase")]
pub enum Interval {
    Monthly,
    Yearly,
}

impl Default for Interval {
    fn default() -> Self {
        Self::Monthly
    }
}

/// Wrapper type for Stripe price IDs with validation
#[derive(Debug, Clone)]
pub struct SubscriptionPriceId {
    monthly: String,
    yearly: String,
}

impl SubscriptionPriceId {
    /// Creates a new SubscriptionPriceId with monthly and yearly price IDs
    pub fn new(monthly: impl Into<String>, yearly: impl Into<String>) -> Self {
        Self {
            monthly: monthly.into(),
            yearly: yearly.into(),
        }
    }

    /// Gets the price ID for the given interval
    pub fn get(&self, interval: Interval) -> &str {
        match interval {
            Interval::Monthly => &self.monthly,
            Interval::Yearly => &self.yearly,
        }
    }

    /// Gets the monthly price ID
    pub fn monthly(&self) -> &str {
        &self.monthly
    }

    /// Gets the yearly price ID
    pub fn yearly(&self) -> &str {
        &self.yearly
    }
}
