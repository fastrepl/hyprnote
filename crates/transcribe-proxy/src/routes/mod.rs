pub mod batch;
pub mod streaming;

use std::collections::HashMap;

use axum::{
    Router,
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post},
};
use owhisper_providers::Provider;

use crate::config::SttProxyConfig;

#[derive(Clone)]
pub(crate) struct AppState {
    pub config: SttProxyConfig,
    pub client: reqwest::Client,
}

impl AppState {
    pub fn resolve_provider(
        &self,
        params: &HashMap<String, String>,
    ) -> Result<(Provider, String), Response> {
        let provider = params
            .get("provider")
            .and_then(|s| s.parse::<Provider>().ok())
            .unwrap_or(self.config.default_provider);

        match self.config.api_key_for(provider) {
            Some(key) => Ok((provider, key.to_string())),
            None => {
                tracing::warn!(provider = ?provider, "requested provider not configured");
                Err((
                    StatusCode::BAD_REQUEST,
                    "requested provider is not available",
                )
                    .into_response())
            }
        }
    }
}

pub fn router(config: SttProxyConfig) -> Router {
    let state = AppState {
        config,
        client: reqwest::Client::new(),
    };

    Router::new()
        .route("/listen", get(streaming::handler))
        .route("/listen", post(batch::handler))
        .with_state(state)
}
