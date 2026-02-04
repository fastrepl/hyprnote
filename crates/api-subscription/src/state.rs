use stripe::Client as StripeClient;

use crate::config::SubscriptionConfig;
use crate::supabase::SupabaseClient;

#[derive(Clone)]
pub struct AppState {
    pub config: SubscriptionConfig,
    pub supabase: SupabaseClient,
    pub stripe: StripeClient,
}

impl AppState {
    pub fn new(config: SubscriptionConfig) -> Self {
        let supabase = SupabaseClient::new(
            config.supabase_url.clone(),
            config.supabase_anon_key.clone(),
        );

        let stripe = StripeClient::new(&config.stripe_api_key);

        Self {
            config,
            supabase,
            stripe,
        }
    }
}
