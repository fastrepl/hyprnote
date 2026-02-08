use std::sync::Arc;

use crate::models::SubscriptionPriceId;

/// Configuration for the subscription API service
#[derive(Clone)]
pub struct SubscriptionConfig {
    pub supabase_url: String,
    pub supabase_anon_key: String,
    pub stripe_api_key: String,
    pub price_ids: SubscriptionPriceId,
    pub auth: Option<Arc<hypr_supabase_auth::SupabaseAuth>>,
}

impl SubscriptionConfig {
    /// Creates a new SubscriptionConfig with required Supabase and Stripe credentials
    pub fn new(
        supabase_url: impl Into<String>,
        supabase_anon_key: impl Into<String>,
        stripe_api_key: impl Into<String>,
    ) -> Self {
        Self {
            supabase_url: supabase_url.into(),
            supabase_anon_key: supabase_anon_key.into(),
            stripe_api_key: stripe_api_key.into(),
            price_ids: SubscriptionPriceId::new("", ""),
            auth: None,
        }
    }

    /// Sets the Stripe price IDs for monthly and yearly subscriptions
    pub fn with_stripe_prices(
        mut self,
        monthly_price_id: impl Into<String>,
        yearly_price_id: impl Into<String>,
    ) -> Self {
        self.price_ids = SubscriptionPriceId::new(monthly_price_id, yearly_price_id);
        self
    }

    /// Sets the authentication provider
    pub fn with_auth(mut self, auth: Arc<hypr_supabase_auth::SupabaseAuth>) -> Self {
        self.auth = Some(auth);
        self
    }
}
