use crate::StripeEnv;
use hypr_api_env::SupabaseEnv;

#[derive(Clone)]
pub struct SubscriptionConfig {
    pub supabase_url: String,
    pub supabase_anon_key: String,
    pub stripe_api_key: String,
    pub stripe_monthly_price_id: String,
    pub stripe_yearly_price_id: String,
}

impl SubscriptionConfig {
    pub fn new(supabase: &SupabaseEnv, stripe: &StripeEnv) -> Self {
        Self {
            supabase_url: supabase.supabase_url.clone(),
            supabase_anon_key: supabase.supabase_anon_key.clone(),
            stripe_api_key: stripe.stripe_api_key.clone(),
            stripe_monthly_price_id: stripe.stripe_monthly_price_id.clone(),
            stripe_yearly_price_id: stripe.stripe_yearly_price_id.clone(),
        }
    }
}
