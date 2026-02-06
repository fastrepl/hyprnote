use std::sync::Arc;

#[derive(Clone)]
pub struct SubscriptionConfig {
    pub supabase_url: String,
    pub supabase_anon_key: String,
    pub stripe_api_key: String,
    pub stripe_monthly_price_id: String,
    pub stripe_yearly_price_id: String,
    pub auth: Option<Arc<hypr_supabase_auth::SupabaseAuth>>,
}

impl SubscriptionConfig {
    pub fn new(
        supabase_url: impl Into<String>,
        supabase_anon_key: impl Into<String>,
        stripe_api_key: impl Into<String>,
    ) -> Self {
        Self {
            supabase_url: supabase_url.into(),
            supabase_anon_key: supabase_anon_key.into(),
            stripe_api_key: stripe_api_key.into(),
            stripe_monthly_price_id: String::new(),
            stripe_yearly_price_id: String::new(),
            auth: None,
        }
    }

    pub fn with_stripe_monthly_price(mut self, price_id: impl Into<String>) -> Self {
        self.stripe_monthly_price_id = price_id.into();
        self
    }

    pub fn with_stripe_yearly_price(mut self, price_id: impl Into<String>) -> Self {
        self.stripe_yearly_price_id = price_id.into();
        self
    }

    pub fn with_auth(mut self, auth: Arc<hypr_supabase_auth::SupabaseAuth>) -> Self {
        self.auth = Some(auth);
        self
    }
}
