mod external_url;
mod local_file;

mod types;
pub use types::*;

#[derive(Debug, Default)]
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

    pub fn build(self) -> Client {
        let mut headers = reqwest::header::HeaderMap::new();
        let mut auth = reqwest::header::HeaderValue::from_str(&self.api_key.unwrap()).unwrap();
        auth.set_sensitive(true);
        headers.insert("X-CLOVA-API-KEY", auth);

        let client = reqwest::Client::builder()
            .default_headers(headers)
            .build()
            .unwrap();

        Client {
            api_base: self.api_base.unwrap().parse().unwrap(),
            client,
        }
    }
}

#[derive(Debug, Clone)]
pub struct Client {
    api_base: url::Url,
    client: reqwest::Client,
}

impl Client {
    pub fn builder() -> ClientBuilder {
        ClientBuilder::default()
    }
}
