use hypr_api_auth::AuthState;
use stripe::Client as StripeClient;

use crate::config::SubscriptionConfig;
use crate::supabase::SupabaseClient;

#[derive(Clone)]
pub struct AppState {
    pub config: SubscriptionConfig,
    pub supabase: SupabaseClient,
    pub stripe: StripeClient,
    pub auth: AuthState,
}

impl AppState {
    pub fn new(config: SubscriptionConfig) -> Self {
        let supabase = SupabaseClient::new(
            config.supabase_url.clone(),
            config.supabase_anon_key.clone(),
        );

        let stripe = StripeClient::new(&config.stripe_api_key);
        let auth = AuthState::new(&config.supabase_url);

        Self {
            config,
            supabase,
            stripe,
            auth,
        }
    }
}
