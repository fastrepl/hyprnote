mod get_job;
mod submit_diarization_job;
mod test_key;

pub struct PyannoteClient {
    client: reqwest::Client,
    api_base: url::Url,
}

impl PyannoteClient {
    pub fn builder() -> PyannoteClientBuilder {
        PyannoteClientBuilder {
            api_base: None,
            api_key: None,
        }
    }
}

pub struct PyannoteClientBuilder {
    api_base: Option<String>,
    api_key: Option<String>,
}

impl PyannoteClientBuilder {
    pub fn api_base(mut self, api_base: impl Into<String>) -> Self {
        self.api_base = Some(api_base.into());
        self
    }

    pub fn api_key(mut self, api_key: impl Into<String>) -> Self {
        self.api_key = Some(api_key.into());
        self
    }

    pub fn build(self) -> PyannoteClient {
        let mut headers = reqwest::header::HeaderMap::new();

        // https://docs.pyannote.ai/authentication
        let auth_str = format!("Bearer {}", self.api_key.unwrap());
        let mut auth_value = reqwest::header::HeaderValue::from_str(&auth_str).unwrap();
        auth_value.set_sensitive(true);

        headers.insert(reqwest::header::AUTHORIZATION, auth_value);

        let client = reqwest::Client::builder()
            .default_headers(headers)
            .build()
            .unwrap();

        let api_base = self
            .api_base
            .unwrap_or("https://api.pyannote.ai".to_string())
            .parse()
            .unwrap();

        PyannoteClient { client, api_base }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn get_client() -> PyannoteClient {
        PyannoteClient::builder()
            .api_key("sk_b669518cdf86452a9ffe19b7ae5d6cee")
            .build()
    }

    // cargo test test_client -p pyannote --  --ignored --nocapture
    #[ignore]
    #[tokio::test]
    async fn test_client() {
        let client = get_client();

        match client.test().await.unwrap() {
            test_key::Response::Ok { status, message } => assert_eq!(status, "OK"),
            test_key::Response::Error { message } => panic!("{}", message),
        }
    }

    // cargo test test_diarization -p pyannote --  --ignored --nocapture
    #[ignore]
    #[tokio::test]
    async fn test_diarization() {
        let _ = get_client();
        let _ = hypr_data::ENGLISH_CONVERSATION_WAV;
    }
}
