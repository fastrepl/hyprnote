use serde::Deserialize;

/// Environment configuration for the subscription service
#[derive(Debug, Deserialize)]
pub struct Env {
    pub supabase_url: String,
    pub supabase_anon_key: String,
    pub stripe_api_key: String,
    pub stripe_monthly_price_id: String,
    pub stripe_yearly_price_id: String,
}
