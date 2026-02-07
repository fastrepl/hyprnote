use serde::Deserialize;

#[derive(Deserialize)]
pub struct Env {
    pub nango_api_base: String,
    pub nango_api_key: String,
    pub nango_webhook_secret: Option<String>,
}
