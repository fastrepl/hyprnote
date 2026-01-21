use hypr_language::ISO639;
use owhisper_client::Provider;
use owhisper_interface::ListenParams;

use crate::query_params::{QueryParams, QueryValue};

use super::hyprnote::test_helpers::{
    build_initial_message_with_adapter, build_listen_params, build_response_transformer,
    build_upstream_url_with_adapter,
};

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
