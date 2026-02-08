use crate::NangoWebhookEnv;
use hypr_api_env::NangoEnv;

#[derive(Clone)]
pub struct IntegrationConfig {
    pub nango_api_base: String,
    pub nango_api_key: String,
    pub nango_webhook_secret: String,
}

impl IntegrationConfig {
    pub fn new(nango: &NangoEnv, webhook: &NangoWebhookEnv) -> Self {
        Self {
            nango_api_base: nango.nango_api_base.clone(),
            nango_api_key: nango.nango_api_key.clone(),
            nango_webhook_secret: webhook.nango_webhook_secret.clone(),
        }
    }
}
