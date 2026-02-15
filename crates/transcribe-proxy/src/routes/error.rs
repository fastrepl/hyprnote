use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
};
use owhisper_client::{
    CallbackResult, CallbackSttAdapter, DeepgramAdapter, Provider, SonioxAdapter,
};

pub(crate) enum RouteError {
    MissingConfig(&'static str),
    Unauthorized(&'static str),
    BadRequest(String),
    NotFound(&'static str),
    BadGateway(String),
    Internal(String),
}

impl IntoResponse for RouteError {
    fn into_response(self) -> Response {
        let (status, msg) = match self {
            Self::MissingConfig(m) => (StatusCode::INTERNAL_SERVER_ERROR, m.into()),
            Self::Unauthorized(m) => (StatusCode::UNAUTHORIZED, m.into()),
            Self::BadRequest(m) => (StatusCode::BAD_REQUEST, m),
            Self::NotFound(m) => (StatusCode::NOT_FOUND, m.into()),
            Self::BadGateway(m) => (StatusCode::BAD_GATEWAY, m),
            Self::Internal(m) => (StatusCode::INTERNAL_SERVER_ERROR, m),
        };
        (status, msg).into_response()
    }
}

pub(crate) fn parse_async_provider(s: &str) -> Result<Provider, RouteError> {
    match s {
        "soniox" => Ok(Provider::Soniox),
        "deepgram" => Ok(Provider::Deepgram),
        other => Err(RouteError::BadRequest(format!(
            "unsupported async provider: {other}"
        ))),
    }
}

pub(crate) async fn submit_to_provider(
    provider: Provider,
    client: &reqwest::Client,
    api_key: &str,
    audio_url: &str,
    callback_url: &str,
) -> Result<String, owhisper_client::Error> {
    match provider {
        Provider::Soniox => {
            SonioxAdapter
                .submit_callback(client, api_key, audio_url, callback_url)
                .await
        }
        Provider::Deepgram => {
            DeepgramAdapter
                .submit_callback(client, api_key, audio_url, callback_url)
                .await
        }
        other => Err(owhisper_client::Error::AudioProcessing(format!(
            "provider {other:?} does not support callback transcription"
        ))),
    }
}

pub(crate) async fn process_provider_callback(
    provider: Provider,
    client: &reqwest::Client,
    api_key: &str,
    payload: serde_json::Value,
) -> Result<CallbackResult, owhisper_client::Error> {
    match provider {
        Provider::Soniox => {
            SonioxAdapter
                .process_callback(client, api_key, payload)
                .await
        }
        Provider::Deepgram => {
            DeepgramAdapter
                .process_callback(client, api_key, payload)
                .await
        }
        other => Err(owhisper_client::Error::AudioProcessing(format!(
            "provider {other:?} does not support callback transcription"
        ))),
    }
}
