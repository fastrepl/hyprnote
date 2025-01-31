pub mod get_job;
pub mod submit_diarization_job;
pub mod test_key;

#[derive(Debug, Clone)]
pub struct PyannoteClient {
    client: reqwest::Client,
    api_base: url::Url,
}

impl PyannoteClient {
    pub fn builder() -> PyannoteClientBuilder {
        PyannoteClientBuilder { api_key: None }
    }
}

pub struct PyannoteClientBuilder {
    api_key: Option<String>,
}

impl PyannoteClientBuilder {
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

        let api_base = "https://api.pyannote.ai".parse().unwrap();
        PyannoteClient { client, api_base }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn get_client() -> PyannoteClient {
        PyannoteClient::builder()
            .api_key(std::env::var("PYANNOTE_API_KEY").unwrap())
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
        let _ = hypr_data::english_1::AUDIO;

        let client = get_client();
        let res = client
            .submit_diarization_job(submit_diarization_job::Request {
                url: "https://pub-b3736ee27dd54b7aa6bb39be9fcd398d.r2.dev/George%20Hotz%EF%BC%9A%20Comma.ai%2C%20OpenPilot%2C%20and%20Autonomous%20Vehicles%20%EF%BD%9C%20Lex%20Fridman%20Podcast%20%2331%20%5BiwcYp-XT7UI%5D.mp3".to_string(),
                webhook: None,
                num_speakers: None,
                confidence: None,
            })
            .await
            .unwrap();

        if let submit_diarization_job::Response::Ok { job_id, .. } = res {
            println!("{:?}", job_id);
        }
    }

    // cargo test test_get_job -p pyannote --  --ignored --nocapture
    #[ignore]
    #[tokio::test]
    async fn test_get_job() {
        let client = get_client();

        let req = get_job::Request {
            job_id: "54a2cfa1-b71d-4c77-abae-50bdd0a4f892".to_string(),
        };
        let res = client.get_job(req).await.unwrap();
        println!("{:?}", res);
    }
}
