use std::collections::HashMap;

use axum::{
    extract::{Query, State, WebSocketUpgrade},
    http::StatusCode,
    response::{IntoResponse, Response},
};
use owhisper_providers::{Auth, Provider};

use crate::analytics::SttEvent;
use crate::config::SttProxyConfig;
use crate::relay::WebSocketProxy;

use super::{AppState, ResolvedProvider};

#[derive(serde::Deserialize)]
struct InitResponse {
    id: String,
    url: String,
}

fn parse_param<T: std::str::FromStr>(params: &HashMap<String, String>, key: &str, default: T) -> T {
    params
        .get(key)
        .and_then(|s| s.parse().ok())
        .unwrap_or(default)
}

pub async fn handler(
    State(state): State<AppState>,
    ws: WebSocketUpgrade,
    Query(mut params): Query<HashMap<String, String>>,
) -> Response {
    let resolved = match state.resolve_provider(&mut params) {
        Ok(v) => v,
        Err(resp) => return resp,
    };

    let provider = resolved.provider();

    let proxy = if let Some(custom_url) = state.config.upstream_url_for(provider) {
        build_proxy_with_url(&resolved, custom_url, &state.config)
    } else {
        match provider.auth() {
            Auth::SessionInit { header_name } => {
                let url = match init_session(&state, &resolved, header_name, &params).await {
                    Ok(url) => url,
                    Err(e) => {
                        tracing::error!(error = %e, "failed to init session");
                        return (StatusCode::BAD_GATEWAY, e).into_response();
                    }
                };
                build_proxy_with_url(&resolved, &url, &state.config)
            }
            _ => {
                let base = url::Url::parse(&provider.default_ws_url()).unwrap();
                build_proxy_with_components(&resolved, base, params, &state.config)
            }
        }
    };

    match proxy {
        Ok(p) => p.handle_upgrade(ws).await.into_response(),
        Err(e) => {
            tracing::error!(error = ?e, "failed to build proxy");
            (StatusCode::BAD_REQUEST, format!("{}", e)).into_response()
        }
    }
}

fn build_session_config(
    provider: Provider,
    params: &HashMap<String, String>,
) -> Result<serde_json::Value, String> {
    let sample_rate: u32 = parse_param(params, "sample_rate", 16000);
    let channels: u8 = parse_param(params, "channels", 1);
    provider
        .session_init_config(sample_rate, channels)
        .ok_or_else(|| format!("{:?} does not support session init config", provider))
}

async fn init_session(
    state: &AppState,
    resolved: &ResolvedProvider,
    header_name: &'static str,
    params: &HashMap<String, String>,
) -> Result<String, String> {
    let provider = resolved.provider();
    let init_url = provider
        .default_api_url()
        .ok_or_else(|| format!("{:?} does not support session init", provider))?;

    let config = build_session_config(provider, params)?;

    let resp = state
        .client
        .post(init_url)
        .header(header_name, resolved.api_key())
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

macro_rules! finalize_proxy_builder {
    ($builder:expr, $provider:expr, $config:expr) => {
        match &$config.analytics {
            Some(analytics) => {
                let analytics = analytics.clone();
                let provider_name = format!("{:?}", $provider).to_lowercase();
                $builder
                    .on_close(move |duration| {
                        let analytics = analytics.clone();
                        let provider_name = provider_name.clone();
                        async move {
                            analytics
                                .report_stt(SttEvent {
                                    provider: provider_name,
                                    duration,
                                })
                                .await;
                        }
                    })
                    .build()
            }
            None => $builder.build(),
        }
    };
}

fn build_proxy_with_url(
    resolved: &ResolvedProvider,
    upstream_url: &str,
    config: &SttProxyConfig,
) -> Result<WebSocketProxy, crate::ProxyError> {
    let provider = resolved.provider();
    let builder = WebSocketProxy::builder()
        .upstream_url(upstream_url)
        .connect_timeout(config.connect_timeout)
        .control_message_types(provider.control_message_types())
        .apply_auth(resolved);

    finalize_proxy_builder!(builder, provider, config)
}

fn build_proxy_with_components(
    resolved: &ResolvedProvider,
    base_url: url::Url,
    client_params: HashMap<String, String>,
    config: &SttProxyConfig,
) -> Result<WebSocketProxy, crate::ProxyError> {
    let provider = resolved.provider();
    let builder = WebSocketProxy::builder()
        .upstream_url_from_components(base_url, client_params, provider.default_query_params())
        .connect_timeout(config.connect_timeout)
        .control_message_types(provider.control_message_types())
        .apply_auth(resolved);

    finalize_proxy_builder!(builder, provider, config)
}
