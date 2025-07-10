mod license;

#[derive(Clone)]
pub struct KeygenClient {
    api_base: url::Url,
    client: reqwest::Client,
}

#[derive(Debug, Default)]
pub struct KeygenClientBuilder {
    api_base: Option<String>,
    api_key: Option<String>,
}

impl KeygenClient {
    pub fn builder() -> KeygenClientBuilder {
        KeygenClientBuilder::default()
    }
}
impl KeygenClientBuilder {
    pub fn api_base(mut self, api_base: impl Into<String>) -> Self {
        self.api_base = Some(api_base.into());
        self
    }

    pub fn api_key(mut self, api_key: impl Into<String>) -> Self {
        self.api_key = Some(api_key.into());
        self
    }

    pub fn build(self) -> KeygenClient {
        let mut headers = reqwest::header::HeaderMap::new();

        // https://docs.getlago.com/api-reference/intro
        let auth_str = format!("Bearer {}", self.api_key.unwrap());
        let mut auth_value = reqwest::header::HeaderValue::from_str(&auth_str).unwrap();
        auth_value.set_sensitive(true);

        headers.insert(reqwest::header::AUTHORIZATION, auth_value);

        let client = reqwest::Client::builder()
            .default_headers(headers)
            .build()
            .unwrap();

        KeygenClient {
            api_base: self.api_base.unwrap().parse().unwrap(),
            client,
        }
    }
}
