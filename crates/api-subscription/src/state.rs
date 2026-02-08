use stripe::Client as StripeClient;

use crate::clients::SupabaseClient;
use crate::config::SubscriptionConfig;

/// Application state containing all service clients and configuration
#[derive(Clone)]
pub struct AppState {
    pub config: SubscriptionConfig,
    pub supabase: SupabaseClient,
    pub stripe: StripeClient,
}

impl AppState {
    /// Creates a new AppState from a SubscriptionConfig
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
