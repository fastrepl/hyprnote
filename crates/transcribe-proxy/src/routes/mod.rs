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

use crate::auto_routing::{AutoRouter, should_use_auto_routing};
use crate::config::SttProxyConfig;
use crate::provider_selector::{ProviderSelector, SelectedProvider};
use crate::query_params::QueryParams;

#[derive(Clone)]
pub(crate) struct AppState {
    pub config: SttProxyConfig,
    pub selector: ProviderSelector,
    pub router: Option<Arc<AutoRouter>>,
    pub client: reqwest::Client,
}

impl AppState {
    pub fn resolve_provider(&self, params: &mut QueryParams) -> Result<SelectedProvider, Response> {
        let provider_param = params.remove_first("provider");

        if self.should_use_auto_routing(provider_param.as_deref()) {
            return self.resolve_auto_provider(params);
        }

        let requested = provider_param.and_then(|s| s.parse().ok());

        self.selector.select(requested).map_err(|e| {
            tracing::warn!(
                error = %e,
                requested_provider = ?requested,
                "provider_selection_failed"
            );
            (StatusCode::BAD_REQUEST, e.to_string()).into_response()
        })
    }

    fn should_use_auto_routing(&self, provider_param: Option<&str>) -> bool {
        should_use_auto_routing(provider_param, self.router.is_some())
    }

    fn resolve_auto_provider(&self, params: &QueryParams) -> Result<SelectedProvider, Response> {
        let router = self.router.as_ref().ok_or_else(|| {
            tracing::warn!("auto_routing_not_configured");
            (StatusCode::BAD_REQUEST, "auto routing is not configured").into_response()
        })?;

        let languages = params.get_languages();
        let available_providers = self.selector.available_providers();
        let routed_provider = router.select_provider(&languages, &available_providers);

        tracing::debug!(
            languages = ?languages,
            available_providers = ?available_providers,
            routed_provider = ?routed_provider,
            "auto_routing"
        );

        self.selector.select(routed_provider).map_err(|e| {
            tracing::warn!(
                error = %e,
                languages = ?languages,
                "auto_routing_failed"
            );
            (StatusCode::BAD_REQUEST, e.to_string()).into_response()
        })
    }

    pub fn resolve_auto_provider_chain(&self, params: &QueryParams) -> Vec<SelectedProvider> {
        let Some(router) = self.router.as_ref() else {
            return vec![];
        };

        let languages = params.get_languages();
        let available_providers = self.selector.available_providers();

        router
            .select_provider_chain(&languages, &available_providers)
            .into_iter()
            .filter_map(|p| self.selector.select(Some(p)).ok())
            .collect()
    }
}

fn make_state(config: SttProxyConfig) -> AppState {
    let selector = config.provider_selector();
    let router = config.auto_router().map(Arc::new);
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
