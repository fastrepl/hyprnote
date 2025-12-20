mod batch;
mod streaming;

use std::collections::HashMap;

use axum::{
    Router,
    extract::DefaultBodyLimit,
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post},
};

use crate::config::SttProxyConfig;
use owhisper_providers::Provider;

pub struct ResolvedProvider {
    provider: Provider,
    api_key: String,
}

impl ResolvedProvider {
    pub fn provider(&self) -> Provider {
        self.provider
    }

    pub fn api_key(&self) -> &str {
        &self.api_key
    }
}

#[derive(Clone)]
pub(crate) struct AppState {
    pub config: SttProxyConfig,
    pub client: reqwest::Client,
}

impl AppState {
    pub fn resolve_provider(
        &self,
        params: &mut HashMap<String, String>,
    ) -> Result<ResolvedProvider, Response> {
        let provider = params
            .remove("provider")
            .and_then(|s| s.parse::<Provider>().ok())
            .unwrap_or(self.config.default_provider);

        match self.config.api_key_for(provider) {
            Some(key) => Ok(ResolvedProvider {
                provider,
                api_key: key.into(),
            }),
            None => {
                tracing::warn!(provider = ?provider, "requested_provider_not_available");
                Err((StatusCode::BAD_REQUEST, "requested_provider_not_available").into_response())
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
        .layer(DefaultBodyLimit::max(100 * 1024 * 1024))
        .with_state(state)
}
