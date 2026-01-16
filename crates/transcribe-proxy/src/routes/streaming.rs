use axum::{
    extract::{State, WebSocketUpgrade},
    http::StatusCode,
    response::{IntoResponse, Response},
};
use owhisper_providers::{Auth, Provider};

use crate::analytics::SttEvent;
use crate::config::SttProxyConfig;
use crate::provider_selector::SelectedProvider;
use crate::query_params::QueryParams;
use crate::relay::WebSocketProxy;

use super::AppState;

#[derive(serde::Deserialize)]
struct InitResponse {
    id: String,
    url: String,
}

fn parse_param<T: std::str::FromStr>(params: &QueryParams, key: &str, default: T) -> T {
    params
        .get_first(key)
        .and_then(|s| s.parse().ok())
        .unwrap_or(default)
}

pub async fn handler(
    State(state): State<AppState>,
    ws: WebSocketUpgrade,
    mut params: QueryParams,
) -> Response {
    let selected = match state.resolve_provider(&mut params) {
        Ok(v) => v,
        Err(resp) => return resp,
    };

    let provider = selected.provider();
    let provider_name = format!("{:?}", provider).to_lowercase();

    let proxy = if let Some(custom_url) = selected.upstream_url() {
        build_proxy_with_url(&selected, custom_url, &state.config)
    } else {
        match provider.auth() {
            Auth::SessionInit { header_name } => {
                let url = match init_session(&state, &selected, header_name, &params).await {
                    Ok(url) => url,
                    Err(e) => {
                        tracing::error!(
                            error = %e,
                            provider = ?selected.provider(),
                            "session_init_failed"
                        );
                        state
                            .config
                            .health
                            .record_error(502, e.clone(), Some(provider_name));
                        return (StatusCode::BAD_GATEWAY, e).into_response();
                    }
                };
                build_proxy_with_url(&selected, &url, &state.config)
            }
            _ => {
                let base = url::Url::parse(&provider.default_ws_url()).unwrap();
                build_proxy_with_components(&selected, base, params, &state.config)
            }
        }
    };

    match proxy {
        Ok(p) => p.handle_upgrade(ws).await.into_response(),
        Err(e) => {
            tracing::error!(
                error = ?e,
                provider = ?provider,
                "proxy_build_failed"
            );
            state
                .config
                .health
                .record_error(400, format!("{}", e), Some(provider_name));
            (StatusCode::BAD_REQUEST, format!("{}", e)).into_response()
        }
    }
}

fn build_session_config(
    provider: Provider,
    params: &QueryParams,
) -> Result<serde_json::Value, String> {
    let sample_rate: u32 = parse_param(params, "sample_rate", 16000);
    let channels: u8 = parse_param(params, "channels", 1);
    provider
        .session_init_config(sample_rate, channels)
        .ok_or_else(|| format!("{:?} does not support session init config", provider))
}

async fn init_session(
    state: &AppState,
    selected: &SelectedProvider,
    header_name: &'static str,
    params: &QueryParams,
) -> Result<String, String> {
    let provider = selected.provider();
    let init_url = provider
        .default_api_url()
        .ok_or_else(|| format!("{:?} does not support session init", provider))?;

    let config = build_session_config(provider, params)?;

    let resp = state
        .client
        .post(init_url)
        .header(header_name, selected.api_key())
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

    tracing::debug!(
        session_id = %init.id,
        provider = ?provider,
        "session_initialized"
    );

    Ok(init.url)
}

macro_rules! finalize_proxy_builder {
    ($builder:expr, $provider:expr, $config:expr) => {{
        let health = $config.health.clone();
        let provider_name = format!("{:?}", $provider).to_lowercase();

        match &$config.analytics {
            Some(analytics) => {
                let analytics = analytics.clone();
                let provider_name_analytics = provider_name.clone();
                let health_analytics = health.clone();
                let provider_name_health = provider_name.clone();
                $builder
                    .on_close(move |duration, close_reason| {
                        let analytics = analytics.clone();
                        let provider_name_analytics = provider_name_analytics.clone();
                        let health = health_analytics.clone();
                        let provider_name_health = provider_name_health.clone();
                        async move {
                            analytics
                                .report_stt(SttEvent {
                                    provider: provider_name_analytics,
                                    duration,
                                })
                                .await;
                            if let Some(reason) = close_reason {
                                // Map WebSocket close codes (4xxx) to HTTP status codes
                                let status_code = if reason.code >= 4000 && reason.code < 4500 {
                                    reason.code - 4000
                                } else if reason.code >= 4500 {
                                    500
                                } else {
                                    reason.code
                                };
                                health.record_error(
                                    status_code,
                                    reason.message,
                                    Some(provider_name_health),
                                );
                            } else {
                                health.record_success();
                            }
                        }
                    })
                    .build()
            }
            None => {
                let provider_name_health = provider_name.clone();
                $builder
                    .on_close(move |_duration, close_reason| {
                        let health = health.clone();
                        let provider_name_health = provider_name_health.clone();
                        async move {
                            if let Some(reason) = close_reason {
                                // Map WebSocket close codes (4xxx) to HTTP status codes
                                let status_code = if reason.code >= 4000 && reason.code < 4500 {
                                    reason.code - 4000
                                } else if reason.code >= 4500 {
                                    500
                                } else {
                                    reason.code
                                };
                                health.record_error(
                                    status_code,
                                    reason.message,
                                    Some(provider_name_health),
                                );
                            } else {
                                health.record_success();
                            }
                        }
                    })
                    .build()
            }
        }
    }};
}

fn build_proxy_with_url(
    selected: &SelectedProvider,
    upstream_url: &str,
    config: &SttProxyConfig,
) -> Result<WebSocketProxy, crate::ProxyError> {
    let provider = selected.provider();
    let builder = WebSocketProxy::builder()
        .upstream_url(upstream_url)
        .connect_timeout(config.connect_timeout)
        .control_message_types(provider.control_message_types())
        .apply_auth(selected);

    finalize_proxy_builder!(builder, provider, config)
}

fn build_proxy_with_components(
    selected: &SelectedProvider,
    base_url: url::Url,
    client_params: QueryParams,
    config: &SttProxyConfig,
) -> Result<WebSocketProxy, crate::ProxyError> {
    let provider = selected.provider();
    let builder = WebSocketProxy::builder()
        .upstream_url_from_components(base_url, client_params, provider.default_query_params())
        .connect_timeout(config.connect_timeout)
        .control_message_types(provider.control_message_types())
        .apply_auth(selected);

    finalize_proxy_builder!(builder, provider, config)
}
