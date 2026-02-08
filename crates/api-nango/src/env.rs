use serde::Deserialize;

#[derive(Deserialize)]
pub struct NangoWebhookEnv {
    pub nango_webhook_secret: String,
}
