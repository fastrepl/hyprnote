mod batch;
mod streaming;

use std::sync::Arc;

use axum::{
    Router,
    extract::DefaultBodyLimit,
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post},
};

use crate::config::SttProxyConfig;
use crate::hyprnote_routing::{HyprnoteRouter, parse_languages};
use crate::provider_selector::{ProviderSelector, SelectedProvider};
use crate::query_params::QueryParams;
use owhisper_client::Provider;

#[derive(Clone)]
pub(crate) struct AppState {
    pub config: SttProxyConfig,
    pub selector: ProviderSelector,
    pub router: Option<Arc<HyprnoteRouter>>,
    pub client: reqwest::Client,
}

impl AppState {
    pub fn resolve_provider(&self, params: &mut QueryParams) -> Result<SelectedProvider, Response> {
        let provider_param = params.remove_first("provider");

        if provider_param.as_deref() == Some("hyprnote") {
            return self.resolve_hyprnote_provider(params);
        }

        let requested = provider_param.and_then(|s| s.parse::<Provider>().ok());

        self.selector.select(requested).map_err(|e| {
            tracing::warn!(
                error = %e,
                requested_provider = ?requested,
                "provider_selection_failed"
            );
            (StatusCode::BAD_REQUEST, e.to_string()).into_response()
        })
    }

    fn resolve_hyprnote_provider(
        &self,
        params: &mut QueryParams,
    ) -> Result<SelectedProvider, Response> {
        let router = self.router.as_ref().ok_or_else(|| {
            tracing::warn!("hyprnote_routing_not_configured");
            (
                StatusCode::BAD_REQUEST,
                "hyprnote routing is not configured",
            )
                .into_response()
        })?;

        let language_param = params
            .get_first("language")
            .or_else(|| params.get_first("languages"));
        let languages = parse_languages(language_param);

        let available_providers = self.selector.available_providers();
        let routed_provider = router.select_provider(&languages, &available_providers);

        tracing::debug!(
            languages = ?languages,
            available_providers = ?available_providers,
            routed_provider = ?routed_provider,
            "hyprnote_routing"
        );

        self.selector.select(routed_provider).map_err(|e| {
            tracing::warn!(
                error = %e,
                languages = ?languages,
                "hyprnote_routing_failed"
            );
            (StatusCode::BAD_REQUEST, e.to_string()).into_response()
        })
    }

    /// Returns a chain of providers to try in order for hyprnote routing.
    /// This enables fallback behavior where multiple providers are tried sequentially.
    pub fn resolve_hyprnote_provider_chain(
        &self,
        params: &QueryParams,
    ) -> Vec<SelectedProvider> {
        let router = match self.router.as_ref() {
            Some(r) => r,
            None => return vec![],
        };

        let language_param = params
            .get_first("language")
            .or_else(|| params.get_first("languages"));
        let languages = parse_languages(language_param);

        let available_providers = self.selector.available_providers();
        let provider_chain = router.select_provider_chain(&languages, &available_providers);

        tracing::debug!(
            languages = ?languages,
            provider_chain = ?provider_chain,
            "hyprnote_routing_chain"
        );

        provider_chain
            .into_iter()
            .filter_map(|p| self.selector.select(Some(p)).ok())
            .collect()
    }
}

fn make_state(config: SttProxyConfig) -> AppState {
    let selector = config.provider_selector();
    let router = config.hyprnote_router().map(Arc::new);
    AppState {
        config,
        selector,
        router,
        client: reqwest::Client::new(),
    }
}

fn with_common_layers(router: Router) -> Router {
    router.layer(DefaultBodyLimit::max(100 * 1024 * 1024))
}

pub fn router(config: SttProxyConfig) -> Router {
    let state = make_state(config);

    with_common_layers(
        Router::new()
            .route("/", get(streaming::handler))
            .route("/", post(batch::handler))
            .route("/listen", get(streaming::handler))
            .route("/listen", post(batch::handler))
            .with_state(state),
    )
}

pub fn listen_router(config: SttProxyConfig) -> Router {
    let state = make_state(config);

    with_common_layers(
        Router::new()
            .route("/listen", get(streaming::handler))
            .route("/listen", post(batch::handler))
            .with_state(state),
    )
}
