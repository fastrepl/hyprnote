mod batch;
mod streaming;

use axum::{
    Router,
    extract::DefaultBodyLimit,
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post},
};

use crate::config::SttProxyConfig;
use crate::provider_selector::{ProviderSelector, SelectedProvider};
use crate::query_params::QueryParams;
use owhisper_providers::Provider;

#[derive(Clone)]
pub(crate) struct AppState {
    pub config: SttProxyConfig,
    pub selector: ProviderSelector,
    pub client: reqwest::Client,
}

impl AppState {
    pub fn resolve_provider(&self, params: &mut QueryParams) -> Result<SelectedProvider, Response> {
        let requested = params
            .remove_first("provider")
            .and_then(|s| s.parse::<Provider>().ok());

        self.selector.select(requested).map_err(|e| {
            tracing::warn!(
                error = %e,
                requested_provider = ?requested,
                "provider_selection_failed"
            );
            (StatusCode::BAD_REQUEST, e.to_string()).into_response()
        })
    }
}

pub fn router(config: SttProxyConfig) -> Router {
    let selector = config.provider_selector();
    let state = AppState {
        config,
        selector,
        client: reqwest::Client::new(),
    };

    Router::new()
        .route("/", get(streaming::handler))
        .route("/", post(batch::handler))
        .route("/listen", get(streaming::handler))
        .route("/listen", post(batch::handler))
        .layer(DefaultBodyLimit::max(100 * 1024 * 1024))
        .with_state(state)
}
