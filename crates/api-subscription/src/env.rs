use serde::Deserialize;

#[derive(Deserialize)]
pub struct StripeEnv {
    pub stripe_api_key: String,
    pub stripe_monthly_price_id: String,
    pub stripe_yearly_price_id: String,
}
