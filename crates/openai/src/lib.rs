pub use async_openai::types::*;

#[derive(Clone)]
pub struct OpenAIClient {
    api_base: url::Url,
    client: reqwest::Client,
}

pub struct OpenAIClientBuilder {
    api_key: Option<String>,
    api_base: Option<String>,
}

impl OpenAIClientBuilder {
    pub fn api_key(mut self, api_key: impl Into<String>) -> Self {
        self.api_key = Some(api_key.into());
        self
    }

    pub fn api_base(mut self, api_base: impl Into<String>) -> Self {
        self.api_base = Some(api_base.into());
        self
    }

    pub fn build(self) -> OpenAIClient {
        let mut headers = reqwest::header::HeaderMap::new();

        let auth_str = format!("Bearer {}", self.api_key.unwrap());
        let mut auth_value = reqwest::header::HeaderValue::from_str(&auth_str).unwrap();
        auth_value.set_sensitive(true);

        headers.insert(reqwest::header::AUTHORIZATION, auth_value);

        let client = reqwest::Client::builder()
            .default_headers(headers)
            .build()
            .unwrap();

        OpenAIClient {
            api_base: self.api_base.unwrap().parse().unwrap(),
            client,
        }
    }
}

impl OpenAIClient {
    pub fn builder() -> OpenAIClientBuilder {
        OpenAIClientBuilder {
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
