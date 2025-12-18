use std::collections::HashMap;

use axum::{
    extract::{Query, WebSocketUpgrade},
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde::{Deserialize, Serialize};

use crate::auth::AuthUser;
use crate::env::env;
use hypr_transcribe_proxy::WebSocketProxy;
use owhisper_providers::{Auth, Provider};

const IGNORED_PARAMS: &[&str] = &["provider", "keywords", "keyterm", "keyterms"];

pub async fn ws_handler(
    auth: AuthUser,
    ws: WebSocketUpgrade,
    Query(params): Query<HashMap<String, String>>,
) -> Response {
    tracing::info!(user_id = %auth.user_id, is_pro = %auth.is_pro(), "ws connection");
    let provider = params
        .get("provider")
        .and_then(|s| s.parse::<Provider>().ok())
        .unwrap_or(Provider::Deepgram);

    let upstream_url = match resolve_upstream_url(provider, &params).await {
        Ok(url) => url,
        Err(e) => {
            tracing::error!(error = %e, "failed to resolve upstream url");
            return (StatusCode::BAD_GATEWAY, e).into_response();
        }
    };

    let proxy = build_proxy(provider, &upstream_url);
    proxy.handle_upgrade(ws).await.into_response()
}

async fn resolve_upstream_url(
    provider: Provider,
    params: &HashMap<String, String>,
) -> Result<String, String> {
    match provider.auth() {
        Auth::SessionInit { header_name } => init_session(provider, header_name, params).await,
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
    provider: Provider,
    header_name: &'static str,
    params: &HashMap<String, String>,
) -> Result<String, String> {
    let env = env();
    let api_key = env.api_key_for(provider);

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

    let config = GladiaConfig {
        encoding: "wav/pcm",
        sample_rate,
        bit_depth: 16,
        channels,
        messages_config: MessagesConfig {
            receive_partial_transcripts: true,
            receive_final_transcripts: true,
        },
        realtime_processing: RealtimeProcessing {
            words_accurate_timestamps: true,
        },
    };

    let client = reqwest::Client::new();
    let resp = client
        .post(init_url)
        .header(header_name, &api_key)
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

fn build_proxy(provider: Provider, upstream_url: &str) -> WebSocketProxy {
    let env = env();
    let api_key = env.api_key_for(provider);

    let mut builder = WebSocketProxy::builder().upstream_url(upstream_url);

    match provider.auth() {
        Auth::Header { .. } => {
            if let Some((name, value)) = provider.build_auth_header(&api_key) {
                builder = builder.header(name, value);
            }
        }
        Auth::FirstMessage { .. } => {
            let auth = provider.auth();
            builder = builder
                .transform_first_message(move |msg| auth.transform_first_message(msg, &api_key));
        }
        Auth::SessionInit { .. } => {}
    }

    builder.build()
}

#[derive(Serialize)]
struct GladiaConfig<'a> {
    encoding: &'a str,
    sample_rate: u32,
    bit_depth: u8,
    channels: u8,
    messages_config: MessagesConfig,
    realtime_processing: RealtimeProcessing,
}

#[derive(Serialize)]
struct MessagesConfig {
    receive_partial_transcripts: bool,
    receive_final_transcripts: bool,
}

#[derive(Serialize)]
struct RealtimeProcessing {
    words_accurate_timestamps: bool,
}

#[derive(Deserialize)]
struct InitResponse {
    id: String,
    url: String,
}
