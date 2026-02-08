use crate::NangoWebhookEnv;
use hypr_api_env::NangoEnv;

#[derive(Clone)]
pub struct NangoConfig {
    pub nango: NangoEnv,
    pub webhook: NangoWebhookEnv,
}

impl NangoConfig {
    pub fn new(nango: &NangoEnv, webhook: &NangoWebhookEnv) -> Self {
        Self {
            nango: nango.clone(),
            webhook: webhook.clone(),
        }
    }
}
