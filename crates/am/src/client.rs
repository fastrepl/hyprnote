use crate::{Error, ErrorResponse, GenericResponse, InitRequest, InitResponse, ServerStatus};
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
            model_repo: None,
            model_folder: None,
        }
    }

    pub fn with_model(
        mut self,
        model: crate::AmModel,
        base_dir: impl AsRef<std::path::Path>,
    ) -> Self {
        self.model = Some(model.model_dir().to_string());
        self.model_repo = Some(model.repo_name().to_string());
        self.model_folder = Some(
            base_dir
                .as_ref()
                .join(model.model_dir())
                .to_string_lossy()
                .to_string(),
        );
        self
    }
}
