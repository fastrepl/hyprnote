use crate::NangoWebhookEnv;
use hypr_api_env::{NangoEnv, SupabaseEnv};

#[derive(Clone)]
pub struct IntegrationConfig {
    pub nango_api_base: String,
    pub nango_api_key: String,
    pub nango_webhook_secret: String,
    pub supabase_url: String,
}

impl IntegrationConfig {
    pub fn new(nango: &NangoEnv, webhook: &NangoWebhookEnv, supabase: &SupabaseEnv) -> Self {
        Self {
            nango_api_base: nango.nango_api_base.clone(),
            nango_api_key: nango.nango_api_key.clone(),
            nango_webhook_secret: webhook.nango_webhook_secret.clone(),
            supabase_url: supabase.supabase_url.clone(),
        }
    }
}
