use crate::{
    ComputeUnits, Error, ErrorResponse, GenericResponse, InitRequest, InitResponse, ServerStatus,
};
use reqwest::{Response, StatusCode};

#[derive(Clone)]
pub struct Client {
    client: reqwest::Client,
    base_url: String,
}

impl Client {
    pub fn new(base_url: impl Into<String>) -> Self {
        Self {
            client: reqwest::Client::new(),
            base_url: base_url.into(),
        }
    }

    pub fn with_client(client: reqwest::Client, base_url: impl Into<String>) -> Self {
        Self {
            client,
            base_url: base_url.into(),
        }
    }

    pub async fn status(&self) -> Result<ServerStatus, Error> {
        let url = format!("{}/v1/status", self.base_url);
        let response = self.client.get(&url).send().await?;

        if response.status().is_success() {
            Ok(response.json().await?)
        } else {
            Err(self.handle_error_response(response).await)
        }
    }

    pub async fn wait_for_ready(
        &self,
        max_wait_time: Option<u32>,
        poll_interval: Option<f32>,
    ) -> Result<ServerStatus, Error> {
        let url = format!("{}/v1/waitForReady", self.base_url);
        let mut request = self.client.get(&url);

        if let Some(max_wait) = max_wait_time {
            request = request.query(&[("maxWaitTime", max_wait)]);
        }

        if let Some(interval) = poll_interval {
            request = request.query(&[("pollInterval", interval)]);
        }

        let response = request.send().await?;

        match response.status() {
            StatusCode::OK => Ok(response.json().await?),
            StatusCode::BAD_REQUEST | StatusCode::REQUEST_TIMEOUT => {
                Err(self.handle_error_response(response).await)
            }
            _ => Err(Error::UnexpectedResponse),
        }
    }

    pub async fn init(&self, request: InitRequest) -> Result<InitResponse, Error> {
        if !request.api_key.starts_with("ax_") {
            return Err(Error::InvalidApiKey);
        }

        let url = format!("{}/v1/init", self.base_url);
        let response = self.client.post(&url).json(&request).send().await?;

        match response.status() {
            StatusCode::OK => Ok(response.json().await?),
            StatusCode::BAD_REQUEST | StatusCode::CONFLICT => {
                Err(self.handle_error_response(response).await)
            }
            _ => Err(Error::UnexpectedResponse),
        }
    }

    pub async fn reset(&self) -> Result<GenericResponse, Error> {
        let url = format!("{}/v1/reset", self.base_url);
        let response = self.client.post(&url).send().await?;

        if response.status().is_success() {
            Ok(response.json().await?)
        } else {
            Err(self.handle_error_response(response).await)
        }
    }

    pub async fn unload(&self) -> Result<GenericResponse, Error> {
        let url = format!("{}/v1/unload", self.base_url);
        let response = self.client.post(&url).send().await?;

        match response.status() {
            StatusCode::OK => Ok(response.json().await?),
            StatusCode::BAD_REQUEST => Err(self.handle_error_response(response).await),
            _ => Err(Error::UnexpectedResponse),
        }
    }

    pub async fn shutdown(&self) -> Result<GenericResponse, Error> {
        let url = format!("{}/v1/shutdown", self.base_url);
        let response = self.client.post(&url).send().await?;

        if response.status().is_success() {
            Ok(response.json().await?)
        } else {
            Err(self.handle_error_response(response).await)
        }
    }

    async fn handle_error_response(&self, response: Response) -> Error {
        if let Ok(error_response) = response.json::<ErrorResponse>().await {
            Error::ServerError {
                status: error_response.status,
                message: error_response.message,
            }
        } else {
            Error::UnexpectedResponse
        }
    }
}

impl InitRequest {
    pub fn new(api_key: impl Into<String>) -> Self {
        Self {
            api_key: api_key.into(),
            model: None,
            model_token: None,
            download_base: None,
            model_repo: None,
            model_folder: None,
            tokenizer_folder: None,
            fast_load: None,
            fast_load_encoder_compute_units: None,
            fast_load_decoder_compute_units: None,
            model_vad: None,
            verbose: None,
        }
    }

    pub fn with_model(mut self, model: impl Into<String>) -> Self {
        self.model = Some(model.into());
        self
    }

    pub fn with_model_token(mut self, token: impl Into<String>) -> Self {
        self.model_token = Some(token.into());
        self
    }

    pub fn with_download_base(mut self, download_base: impl Into<String>) -> Self {
        self.download_base = Some(download_base.into());
        self
    }

    pub fn with_model_repo(mut self, repo: impl Into<String>) -> Self {
        self.model_repo = Some(repo.into());
        self
    }

    pub fn with_model_folder(mut self, folder: impl Into<String>) -> Self {
        self.model_folder = Some(folder.into());
        self
    }

    pub fn with_tokenizer_folder(mut self, folder: impl Into<String>) -> Self {
        self.tokenizer_folder = Some(folder.into());
        self
    }

    pub fn with_fast_load(mut self, fast_load: bool) -> Self {
        self.fast_load = Some(fast_load);
        self
    }

    pub fn with_encoder_compute_units(mut self, units: ComputeUnits) -> Self {
        self.fast_load_encoder_compute_units = Some(units);
        self
    }

    pub fn with_decoder_compute_units(mut self, units: ComputeUnits) -> Self {
        self.fast_load_decoder_compute_units = Some(units);
        self
    }

    pub fn with_model_vad(mut self, vad: bool) -> Self {
        self.model_vad = Some(vad);
        self
    }

    pub fn with_verbose(mut self, verbose: bool) -> Self {
        self.verbose = Some(verbose);
        self
    }
}

impl Default for Client {
    fn default() -> Self {
        Self::new("http://localhost:50060")
    }
}
