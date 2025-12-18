use std::collections::HashMap;
use std::sync::Arc;

use axum::{
    Router,
    extract::{Query, State, WebSocketUpgrade},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::any,
};
use owhisper_providers::{Auth, Provider};

use crate::config::SttProxyConfig;
use crate::proxy::WebSocketProxy;
use hypr_analytics::{SttEvent, SttReporter};

const IGNORED_PARAMS: &[&str] = &["provider", "keywords", "keyterm", "keyterms"];

#[derive(Clone)]
struct AppState {
    config: SttProxyConfig,
    client: reqwest::Client,
}

pub fn router(config: SttProxyConfig) -> Router {
    let state = AppState {
        config,
        client: reqwest::Client::new(),
    };

    Router::new()
        .route("/listen", any(ws_handler))
        .with_state(state)
}

async fn ws_handler(
    State(state): State<AppState>,
    ws: WebSocketUpgrade,
    Query(params): Query<HashMap<String, String>>,
) -> Response {
    let provider = params
        .get("provider")
        .and_then(|s| s.parse::<Provider>().ok())
        .unwrap_or(state.config.default_provider);

    let api_key = match state.config.api_key_for(provider) {
        Some(key) => key.to_string(),
        None => {
            tracing::warn!(provider = ?provider, "requested provider not configured");
            return (
                StatusCode::BAD_REQUEST,
                "requested provider is not available",
            )
                .into_response();
        }
    };

    let upstream_url = match resolve_upstream_url(&state, provider, &api_key, &params).await {
        Ok(url) => url,
        Err(e) => {
            tracing::error!(error = %e, "failed to resolve upstream url");
            return (StatusCode::BAD_GATEWAY, e).into_response();
        }
    };

    let proxy = build_proxy(provider, &api_key, &upstream_url, &state.config);
    proxy.handle_upgrade(ws).await.into_response()
}

async fn resolve_upstream_url(
    state: &AppState,
    provider: Provider,
    api_key: &str,
    params: &HashMap<String, String>,
) -> Result<String, String> {
    match provider.auth() {
        Auth::SessionInit { header_name } => {
            init_session(state, provider, header_name, api_key, params).await
        }
        _ => {
            let mut url = url::Url::parse(&provider.default_ws_url()).unwrap();
            for (key, value) in params {
                if !IGNORED_PARAMS.contains(&key.as_str()) {
                    url.query_pairs_mut().append_pair(key, value);
                }
            }
            for (key, value) in provider.default_query_params() {
                url.query_pairs_mut().append_pair(key, value);
            }
            Ok(url.to_string())
        }
    }
}

async fn init_session(
    state: &AppState,
    provider: Provider,
    header_name: &'static str,
    api_key: &str,
    params: &HashMap<String, String>,
) -> Result<String, String> {
    let init_url = provider
        .default_api_url()
        .ok_or_else(|| format!("{:?} does not support session init", provider))?;

    let sample_rate: u32 = params
        .get("sample_rate")
        .and_then(|s| s.parse().ok())
        .unwrap_or(16000);

    let channels: u8 = params
        .get("channels")
        .and_then(|s| s.parse().ok())
        .unwrap_or(1);

    let config = provider
        .session_init_config(sample_rate, channels)
        .ok_or_else(|| format!("{:?} does not support session init config", provider))?;

    let resp = state
        .client
        .post(init_url)
        .header(header_name, api_key)
        .header("Content-Type", "application/json")
        .json(&config)
        .send()
        .await
        .map_err(|e| format!("session init request failed: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("session init failed: {} - {}", status, body));
    }

    let init: InitResponse = resp
        .json()
        .await
        .map_err(|e| format!("session init parse failed: {}", e))?;

    tracing::debug!(session_id = %init.id, url = %init.url, "session_initialized");

    Ok(init.url)
}

fn build_proxy(
    provider: Provider,
    api_key: &str,
    upstream_url: &str,
    config: &SttProxyConfig,
) -> WebSocketProxy {
    let mut builder = WebSocketProxy::builder()
        .upstream_url(upstream_url)
        .connect_timeout(config.connect_timeout)
        .control_message_types(provider.control_message_types());

    match provider.auth() {
        Auth::Header { .. } => {
            if let Some((name, value)) = provider.build_auth_header(api_key) {
                builder = builder.header(name, value);
            }
        }
        Auth::FirstMessage { .. } => {
            let auth = provider.auth();
            let api_key = api_key.to_string();
            builder = builder
                .transform_first_message(move |msg| auth.transform_first_message(msg, &api_key));
        }
        Auth::SessionInit { .. } => {}
    }

    if let Some(analytics) = config.analytics.clone() {
        let provider_name = format!("{:?}", provider).to_lowercase();
        builder = builder.on_close(move |duration| {
            let analytics: Arc<dyn SttReporter> = analytics.clone();
            let provider_name = provider_name.clone();
            tokio::spawn(async move {
                let event = SttEvent {
                    provider: provider_name,
                    duration,
                };
                analytics.report_stt(event).await;
            });
        });
    }

    builder.build()
}

#[derive(serde::Deserialize)]
struct InitResponse {
    id: String,
    url: String,
}
