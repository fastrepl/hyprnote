mod enhance;
mod transcribe;
mod types;

use tokio_tungstenite::tungstenite::{client::ClientRequestBuilder, http::uri};
pub use types::*;

pub struct Client {
    base: url::Url,
    transcribe_request: ClientRequestBuilder,
    reqwest_client: reqwest::Client,
}

impl Client {
    pub fn builder() -> ClientBuilder {
        ClientBuilder::default()
    }
}

#[derive(Default)]
pub struct ClientBuilder {
    base: Option<String>,
    token: Option<String>,
}

impl ClientBuilder {
    pub fn with_base(mut self, base: impl Into<String>) -> Self {
        self.base = Some(base.into());
        self
    }

    pub fn with_token(mut self, token: impl Into<String>) -> Self {
        self.token = Some(token.into());
        self
    }

    pub fn build(self) -> anyhow::Result<Client> {
        let mut headers = reqwest::header::HeaderMap::new();
        headers.insert(reqwest::header::USER_AGENT, "hyprnote-desktop".parse()?);
        headers.insert(
            reqwest::header::AUTHORIZATION,
            "Bearer ".to_string().parse()?,
        );

        let reqwest_client = reqwest::Client::builder()
            .default_headers(headers)
            .build()?;

        let base = self.base.clone().unwrap().parse::<url::Url>()?;
        let transcribe_request = ClientRequestBuilder::new(self.ws_url(&base)?).with_header(
            reqwest::header::AUTHORIZATION.to_string(),
            format!("Bearer {}", self.token.unwrap()),
        );

        Ok(Client {
            base,
            transcribe_request,
            reqwest_client,
        })
    }

    fn ws_url(&self, url: &url::Url) -> anyhow::Result<uri::Uri> {
        let mut url = url.clone();
        url.set_path("/api/native/transcribe");

        if cfg!(debug_assertions) {
            url.set_scheme("ws").unwrap();
            url.set_host(Some("localhost")).unwrap();
        } else {
            url.set_scheme("wss").unwrap();
            url.set_host(Some("api.hyprnote.com")).unwrap();
        }

        let uri = url.to_string().parse()?;
        Ok(uri)
    }
}

#[derive(Debug, Clone)]
pub struct ClientConfig {
    pub base_url: url::Url,
    pub auth_token: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_transcribe() {
        let client = Client::builder()
            .with_base("http://localhost:8080")
            .with_token("test")
            .build()
            .unwrap();

        let result = client.transcribe().await;
        assert!(result.is_ok());
    }
}
