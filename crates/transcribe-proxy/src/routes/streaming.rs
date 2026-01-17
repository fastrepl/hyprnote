use axum::{
    extract::{State, WebSocketUpgrade},
    http::StatusCode,
    response::{IntoResponse, Response},
};
use owhisper_client::{
    AssemblyAIAdapter, Auth, DeepgramAdapter, ElevenLabsAdapter, FireworksAdapter, GladiaAdapter,
    OpenAIAdapter, Provider, RealtimeSttAdapter, SonioxAdapter, SpeechmaticsAdapter,
};
use owhisper_interface::ListenParams;

use crate::analytics::SttEvent;
use crate::config::SttProxyConfig;
use crate::provider_selector::SelectedProvider;
use crate::query_params::{QueryParams, QueryValue};
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

fn build_listen_params(params: &QueryParams) -> ListenParams {
    let model = params.get_first("model").map(|s| s.to_string());
    let languages = params.get_languages();
    let sample_rate: u32 = parse_param(params, "sample_rate", 16000);
    let channels: u8 = parse_param(params, "channels", 1);

    let keywords: Vec<String> = params
        .get("keyword")
        .or_else(|| params.get("keywords"))
        .map(|v| match v {
            QueryValue::Single(s) => s.split(',').map(|k| k.trim().to_string()).collect(),
            QueryValue::Multi(vec) => vec.iter().map(|k| k.trim().to_string()).collect(),
        })
        .unwrap_or_default();

    ListenParams {
        model,
        languages,
        sample_rate,
        channels,
        keywords,
        ..Default::default()
    }
}

fn build_upstream_url_with_adapter(
    provider: Provider,
    api_base: &str,
    params: &ListenParams,
    channels: u8,
) -> url::Url {
    match provider {
        Provider::Deepgram => DeepgramAdapter.build_ws_url(api_base, params, channels),
        Provider::AssemblyAI => AssemblyAIAdapter.build_ws_url(api_base, params, channels),
        Provider::Soniox => SonioxAdapter.build_ws_url(api_base, params, channels),
        Provider::Fireworks => FireworksAdapter.build_ws_url(api_base, params, channels),
        Provider::OpenAI => OpenAIAdapter.build_ws_url(api_base, params, channels),
        Provider::Gladia => GladiaAdapter.build_ws_url(api_base, params, channels),
        Provider::ElevenLabs => ElevenLabsAdapter.build_ws_url(api_base, params, channels),
        Provider::Speechmatics => SpeechmaticsAdapter.build_ws_url(api_base, params, channels),
    }
}

fn build_initial_message_with_adapter(
    provider: Provider,
    api_key: Option<&str>,
    params: &ListenParams,
    channels: u8,
) -> Option<String> {
    let msg = match provider {
        Provider::Deepgram => DeepgramAdapter.initial_message(api_key, params, channels),
        Provider::AssemblyAI => AssemblyAIAdapter.initial_message(api_key, params, channels),
        Provider::Soniox => SonioxAdapter.initial_message(api_key, params, channels),
        Provider::Fireworks => FireworksAdapter.initial_message(api_key, params, channels),
        Provider::OpenAI => OpenAIAdapter.initial_message(api_key, params, channels),
        Provider::Gladia => GladiaAdapter.initial_message(api_key, params, channels),
        Provider::ElevenLabs => ElevenLabsAdapter.initial_message(api_key, params, channels),
        Provider::Speechmatics => SpeechmaticsAdapter.initial_message(api_key, params, channels),
    };

    msg.and_then(|m| match m {
        owhisper_client::hypr_ws_client::client::Message::Text(t) => Some(t.to_string()),
        _ => None,
    })
}

fn build_response_transformer(
    provider: Provider,
) -> impl Fn(&str) -> Option<String> + Send + Sync + 'static {
    move |raw: &str| {
        let responses: Vec<owhisper_interface::stream::StreamResponse> = match provider {
            Provider::Deepgram => DeepgramAdapter.parse_response(raw),
            Provider::AssemblyAI => AssemblyAIAdapter.parse_response(raw),
            Provider::Soniox => SonioxAdapter.parse_response(raw),
            Provider::Fireworks => FireworksAdapter.parse_response(raw),
            Provider::OpenAI => OpenAIAdapter.parse_response(raw),
            Provider::Gladia => GladiaAdapter.parse_response(raw),
            Provider::ElevenLabs => ElevenLabsAdapter.parse_response(raw),
            Provider::Speechmatics => SpeechmaticsAdapter.parse_response(raw),
        };

        if responses.is_empty() {
            return None;
        }

        if responses.len() == 1 {
            return serde_json::to_string(&responses[0]).ok();
        }

        serde_json::to_string(&responses).ok()
    }
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
                        return (StatusCode::BAD_GATEWAY, e).into_response();
                    }
                };
                build_proxy_with_url(&selected, &url, &state.config)
            }
            _ => build_proxy_with_adapter(&selected, &params, &state.config),
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

fn build_proxy_with_adapter(
    selected: &SelectedProvider,
    client_params: &QueryParams,
    config: &SttProxyConfig,
) -> Result<WebSocketProxy, crate::ProxyError> {
    let provider = selected.provider();
    let listen_params = build_listen_params(client_params);
    let channels: u8 = parse_param(client_params, "channels", 1);

    let api_base = provider.default_api_base();
    let upstream_url =
        build_upstream_url_with_adapter(provider, api_base, &listen_params, channels);

    let initial_message = build_initial_message_with_adapter(
        provider,
        Some(selected.api_key()),
        &listen_params,
        channels,
    );

    let mut builder = WebSocketProxy::builder()
        .upstream_url(upstream_url.as_str())
        .connect_timeout(config.connect_timeout)
        .control_message_types(provider.control_message_types())
        .response_transformer(build_response_transformer(provider))
        .apply_auth(selected);

    if let Some(msg) = initial_message {
        builder = builder.initial_message(msg);
    }

    finalize_proxy_builder!(builder, provider, config)
}

#[cfg(test)]
mod tests {
    use super::*;
    use hypr_language::ISO639;

    #[test]
    fn test_build_listen_params_basic() {
        let mut params = QueryParams::default();
        params.insert(
            "model".to_string(),
            QueryValue::Single("nova-3".to_string()),
        );
        params.insert("language".to_string(), QueryValue::Single("en".to_string()));
        params.insert(
            "sample_rate".to_string(),
            QueryValue::Single("16000".to_string()),
        );
        params.insert("channels".to_string(), QueryValue::Single("1".to_string()));

        let listen_params = build_listen_params(&params);

        assert_eq!(listen_params.model, Some("nova-3".to_string()));
        assert_eq!(listen_params.languages.len(), 1);
        assert_eq!(listen_params.languages[0].iso639(), ISO639::En);
        assert_eq!(listen_params.sample_rate, 16000);
        assert_eq!(listen_params.channels, 1);
    }

    #[test]
    fn test_build_listen_params_with_keywords() {
        let mut params = QueryParams::default();
        params.insert(
            "keyword".to_string(),
            QueryValue::Multi(vec!["Hyprnote".to_string(), "transcription".to_string()]),
        );

        let listen_params = build_listen_params(&params);

        assert_eq!(listen_params.keywords.len(), 2);
        assert!(listen_params.keywords.contains(&"Hyprnote".to_string()));
        assert!(
            listen_params
                .keywords
                .contains(&"transcription".to_string())
        );
    }

    #[test]
    fn test_build_listen_params_default_values() {
        let params = QueryParams::default();
        let listen_params = build_listen_params(&params);

        assert_eq!(listen_params.model, None);
        assert!(listen_params.languages.is_empty());
        assert_eq!(listen_params.sample_rate, 16000);
        assert_eq!(listen_params.channels, 1);
        assert!(listen_params.keywords.is_empty());
    }

    #[test]
    fn test_build_upstream_url_deepgram() {
        let params = ListenParams {
            model: Some("nova-3".to_string()),
            languages: vec![ISO639::En.into()],
            sample_rate: 16000,
            channels: 1,
            ..Default::default()
        };

        let url = build_upstream_url_with_adapter(
            Provider::Deepgram,
            "https://api.deepgram.com/v1",
            &params,
            1,
        );

        assert!(url.as_str().contains("deepgram.com"));
        assert!(url.as_str().contains("model=nova-3"));
    }

    #[test]
    fn test_build_upstream_url_soniox() {
        let params = ListenParams {
            model: Some("stt-rt-v3".to_string()),
            languages: vec![ISO639::En.into()],
            sample_rate: 16000,
            channels: 1,
            ..Default::default()
        };

        let url =
            build_upstream_url_with_adapter(Provider::Soniox, "https://api.soniox.com", &params, 1);

        assert!(url.as_str().contains("soniox.com"));
    }

    #[test]
    fn test_build_initial_message_soniox() {
        let params = ListenParams {
            model: Some("stt-rt-v3".to_string()),
            languages: vec![ISO639::En.into()],
            sample_rate: 16000,
            channels: 1,
            ..Default::default()
        };

        let initial_msg =
            build_initial_message_with_adapter(Provider::Soniox, Some("test-key"), &params, 1);

        assert!(initial_msg.is_some());
        let msg = initial_msg.unwrap();
        assert!(msg.contains("api_key"));
        assert!(msg.contains("test-key"));
    }

    #[test]
    fn test_build_initial_message_deepgram_none() {
        let params = ListenParams {
            model: Some("nova-3".to_string()),
            languages: vec![ISO639::En.into()],
            ..Default::default()
        };

        let initial_msg =
            build_initial_message_with_adapter(Provider::Deepgram, Some("test-key"), &params, 1);

        assert!(initial_msg.is_none());
    }

    #[test]
    fn test_response_transformer_deepgram() {
        let transformer = build_response_transformer(Provider::Deepgram);

        let deepgram_response = r#"{
            "type": "Results",
            "channel_index": [0, 1],
            "duration": 1.0,
            "start": 0.0,
            "is_final": true,
            "speech_final": true,
            "from_finalize": false,
            "channel": {
                "alternatives": [{
                    "transcript": "hello world",
                    "confidence": 0.95,
                    "words": []
                }]
            },
            "metadata": {
                "request_id": "test",
                "model_uuid": "test",
                "model_info": {
                    "name": "nova-3",
                    "version": "1",
                    "arch": "test"
                }
            }
        }"#;

        let result = transformer(deepgram_response);
        assert!(result.is_some());

        let parsed: serde_json::Value = serde_json::from_str(&result.unwrap()).unwrap();
        assert_eq!(parsed["type"], "Results");
    }

    #[test]
    fn test_response_transformer_empty_response() {
        let transformer = build_response_transformer(Provider::Soniox);

        let result = transformer("{}");
        assert!(result.is_none());
    }
}
