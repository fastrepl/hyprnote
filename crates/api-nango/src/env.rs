use serde::Deserialize;

#[derive(Clone, Deserialize)]
pub struct NangoWebhookEnv {
    pub nango_webhook_secret: String,
}
