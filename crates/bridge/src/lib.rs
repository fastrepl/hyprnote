mod types;
pub use types::*;

use url::Url;

pub struct Client {
    config: ClientConfig,
    reqwest_client: reqwest::Client,
}

#[derive(Debug, Clone)]
pub struct ClientConfig {
    pub base_url: Url,
    pub auth_token: Option<String>,
}
