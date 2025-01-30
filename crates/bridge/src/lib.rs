pub mod enhance;
mod timeline;
mod types;
mod websocket;

pub use timeline::*;
pub use types::*;
pub use websocket::*;

#[derive(Clone)]
pub struct Client {
    api_base: url::Url,
    api_key: String,
    reqwest_client: reqwest::Client,
}

impl Client {
    pub fn builder() -> ClientBuilder {
        ClientBuilder::default()
    }

    pub fn transcribe(&self) -> listen::ListenClientBuilder {
        listen::ListenClient::builder()
            .api_base(self.api_base.clone())
            .api_key(self.api_key.clone())
    }
}

#[derive(Default)]
pub struct ClientBuilder {
    api_base: Option<String>,
    api_key: Option<String>,
}

impl ClientBuilder {
    pub fn api_base(mut self, api_base: impl Into<String>) -> Self {
        self.api_base = Some(api_base.into());
        self
    }

    pub fn api_key(mut self, api_key: impl Into<String>) -> Self {
        self.api_key = Some(api_key.into());
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

        let api_base = self.api_base.unwrap().parse::<url::Url>()?;
        let api_key = self.api_key.unwrap();

        Ok(Client {
            api_base,
            api_key,
            reqwest_client,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_simple_client() {
        let _ = Client::builder()
            .api_base("http://localhost:8080")
            .api_key("test")
            .build()
            .unwrap();
    }
}
