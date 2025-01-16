#[derive(Clone)]
pub struct Client {
    api_base: url::Url,
    client: reqwest::Client,
}

pub struct ClientBuilder {
    api_key: Option<String>,
    api_base: Option<String>,
}

impl ClientBuilder {
    pub fn api_key(mut self, api_key: String) -> Self {
        self.api_key = Some(api_key);
        self
    }

    pub fn api_base(mut self, api_base: String) -> Self {
        self.api_base = Some(api_base);
        self
    }

    pub fn build(self) -> Client {
        let mut headers = reqwest::header::HeaderMap::new();

        let auth_str = format!("Bearer {}", self.api_key.unwrap());
        let mut auth_value = reqwest::header::HeaderValue::from_str(&auth_str).unwrap();
        auth_value.set_sensitive(true);

        headers.insert(reqwest::header::AUTHORIZATION, auth_value);

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

impl Client {
    pub fn builder() -> ClientBuilder {
        ClientBuilder {
            api_key: None,
            api_base: None,
        }
    }

    pub async fn chat_completion(
        &self,
        req: &async_openai::types::CreateChatCompletionRequest,
    ) -> Result<reqwest::Response, reqwest::Error> {
        let mut url = self.api_base.clone();
        url.set_path("/v1/chat/completions");

        let stream = req.stream.unwrap_or(false);
        let accept = if stream {
            "text/event-stream"
        } else {
            "application/json"
        };

        self.client
            .post(url)
            .header("Accept", accept)
            .json(&req)
            .send()
            .await
    }
}
