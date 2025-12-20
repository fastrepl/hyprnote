mod common;

use std::time::Duration;

use futures_util::{SinkExt, StreamExt};
use tokio_tungstenite::connect_async;
use tokio_tungstenite::tungstenite::Message;

use common::{
    MessageKind, MockUpstreamConfig, load_fixture, start_mock_server_with_config,
    start_server_with_upstream_url,
};
use owhisper_providers::Provider;

const TEST_RESPONSE_TIMEOUT: Duration = Duration::from_secs(5);

async fn connect_to_proxy(
    proxy_addr: std::net::SocketAddr,
    model: &str,
) -> tokio_tungstenite::WebSocketStream<tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>> {
    let url = format!(
        "ws://{}/listen?model={}&encoding=linear16&sample_rate=16000&channels=1",
        proxy_addr, model
    );
    let (ws_stream, _) = connect_async(&url)
        .await
        .expect("Failed to connect to proxy");
    ws_stream
}

async fn collect_messages(
    ws_stream: tokio_tungstenite::WebSocketStream<
        tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>,
    >,
    timeout: Duration,
) -> (Vec<String>, Option<(u16, String)>) {
    let (mut _sender, mut receiver) = ws_stream.split();
    let mut messages = Vec::new();
    let mut close_info = None;

    let collect_future = async {
        while let Some(msg_result) = receiver.next().await {
            match msg_result {
                Ok(Message::Text(text)) => {
                    messages.push(text.to_string());
                }
                Ok(Message::Close(frame)) => {
                    close_info = frame.map(|f| (f.code.into(), f.reason.to_string()));
                    break;
                }
                Ok(_) => {}
                Err(e) => {
                    eprintln!("WebSocket error: {:?}", e);
                    break;
                }
            }
        }
    };

    let _ = tokio::time::timeout(timeout, collect_future).await;
    (messages, close_info)
}

#[tokio::test]
async fn test_deepgram_normal_transcription_replay() {
    let _ = tracing_subscriber::fmt::try_init();

    let recording = load_fixture("deepgram_normal.jsonl");
    let mock_handle = start_mock_server_with_config(recording, MockUpstreamConfig::default())
        .await
        .expect("Failed to start mock server");

    let proxy_addr =
        start_server_with_upstream_url(Provider::Deepgram, &mock_handle.ws_url()).await;

    let ws_stream = connect_to_proxy(proxy_addr, "nova-3").await;
    let (messages, close_info) = collect_messages(ws_stream, TEST_RESPONSE_TIMEOUT).await;

    assert!(!messages.is_empty(), "Expected to receive messages");

    let has_hello_world = messages.iter().any(|m| m.contains("Hello world"));
    let has_test = messages.iter().any(|m| m.contains("This is a test"));
    assert!(has_hello_world, "Expected 'Hello world' transcript");
    assert!(has_test, "Expected 'This is a test' transcript");

    if let Some((code, _reason)) = close_info {
        assert_eq!(code, 1000, "Expected normal close code 1000");
    }
}

#[tokio::test]
async fn test_deepgram_auth_error_replay() {
    let _ = tracing_subscriber::fmt::try_init();

    let recording = load_fixture("deepgram_auth_error.jsonl");
    let mock_handle = start_mock_server_with_config(recording, MockUpstreamConfig::default())
        .await
        .expect("Failed to start mock server");

    let proxy_addr =
        start_server_with_upstream_url(Provider::Deepgram, &mock_handle.ws_url()).await;

    let ws_stream = connect_to_proxy(proxy_addr, "nova-3").await;
    let (messages, close_info) = collect_messages(ws_stream, TEST_RESPONSE_TIMEOUT).await;

    assert!(!messages.is_empty(), "Expected to receive error message");
    let has_auth_error = messages
        .iter()
        .any(|m| m.contains("INVALID_AUTH") || m.contains("Invalid credentials"));
    assert!(has_auth_error, "Expected auth error message");

    if let Some((code, _reason)) = close_info {
        assert!(
            code == 4401 || code == 1008,
            "Expected close code 4401 or 1008, got {}",
            code
        );
    }
}

#[tokio::test]
async fn test_deepgram_rate_limit_replay() {
    let _ = tracing_subscriber::fmt::try_init();

    let recording = load_fixture("deepgram_rate_limit.jsonl");
    let mock_handle = start_mock_server_with_config(recording, MockUpstreamConfig::default())
        .await
        .expect("Failed to start mock server");

    let proxy_addr =
        start_server_with_upstream_url(Provider::Deepgram, &mock_handle.ws_url()).await;

    let ws_stream = connect_to_proxy(proxy_addr, "nova-3").await;
    let (messages, close_info) = collect_messages(ws_stream, TEST_RESPONSE_TIMEOUT).await;

    let has_rate_limit = messages
        .iter()
        .any(|m| m.contains("TOO_MANY_REQUESTS") || m.contains("Too many requests"));
    assert!(has_rate_limit, "Expected rate limit error message");

    if let Some((code, _reason)) = close_info {
        assert!(
            code == 4429 || code == 1008,
            "Expected close code 4429 or 1008, got {}",
            code
        );
    }
}

#[tokio::test]
async fn test_soniox_normal_transcription_replay() {
    let _ = tracing_subscriber::fmt::try_init();

    let recording = load_fixture("soniox_normal.jsonl");
    let mock_handle = start_mock_server_with_config(recording, MockUpstreamConfig::default())
        .await
        .expect("Failed to start mock server");

    let proxy_addr = start_server_with_upstream_url(Provider::Soniox, &mock_handle.ws_url()).await;

    let ws_stream = connect_to_proxy(proxy_addr, "stt-v3").await;
    let (messages, close_info) = collect_messages(ws_stream, TEST_RESPONSE_TIMEOUT).await;

    assert!(!messages.is_empty(), "Expected to receive messages");

    let has_hello_world = messages.iter().any(|m| m.contains("Hello world"));
    let has_soniox = messages.iter().any(|m| m.contains("Soniox"));
    assert!(has_hello_world, "Expected 'Hello world' transcript");
    assert!(has_soniox, "Expected 'Soniox' transcript");

    if let Some((code, _reason)) = close_info {
        assert_eq!(code, 1000, "Expected normal close code 1000");
    }
}

#[tokio::test]
async fn test_soniox_error_replay() {
    let _ = tracing_subscriber::fmt::try_init();

    let recording = load_fixture("soniox_error.jsonl");
    let mock_handle = start_mock_server_with_config(recording, MockUpstreamConfig::default())
        .await
        .expect("Failed to start mock server");

    let proxy_addr = start_server_with_upstream_url(Provider::Soniox, &mock_handle.ws_url()).await;

    let ws_stream = connect_to_proxy(proxy_addr, "stt-v3").await;
    let (messages, close_info) = collect_messages(ws_stream, TEST_RESPONSE_TIMEOUT).await;

    let has_error = messages
        .iter()
        .any(|m| m.contains("error_code") || m.contains("Cannot continue request"));
    assert!(has_error, "Expected error message");

    if let Some((code, _reason)) = close_info {
        assert!(
            code == 4500 || code == 1011,
            "Expected close code 4500 or 1011, got {}",
            code
        );
    }
}

#[tokio::test]
async fn test_proxy_forwards_all_messages() {
    let _ = tracing_subscriber::fmt::try_init();

    let recording = load_fixture("deepgram_normal.jsonl");
    let expected_text_count = recording
        .server_messages()
        .filter(|m| matches!(m.kind, MessageKind::Text))
        .count();

    let mock_handle = start_mock_server_with_config(recording, MockUpstreamConfig::default())
        .await
        .expect("Failed to start mock server");

    let proxy_addr =
        start_server_with_upstream_url(Provider::Deepgram, &mock_handle.ws_url()).await;

    let ws_stream = connect_to_proxy(proxy_addr, "nova-3").await;
    let (messages, _close_info) = collect_messages(ws_stream, TEST_RESPONSE_TIMEOUT).await;

    assert_eq!(
        messages.len(),
        expected_text_count,
        "Expected {} messages, got {}",
        expected_text_count,
        messages.len()
    );
}

#[tokio::test]
async fn test_proxy_handles_client_disconnect() {
    let _ = tracing_subscriber::fmt::try_init();

    let recording = load_fixture("deepgram_normal.jsonl");
    let mock_handle = start_mock_server_with_config(
        recording,
        MockUpstreamConfig::default()
            .use_timing(true)
            .max_delay_ms(100),
    )
    .await
    .expect("Failed to start mock server");

    let proxy_addr =
        start_server_with_upstream_url(Provider::Deepgram, &mock_handle.ws_url()).await;

    let ws_stream = connect_to_proxy(proxy_addr, "nova-3").await;
    let (mut sender, mut receiver) = ws_stream.split();

    if let Some(msg) = receiver.next().await {
        assert!(msg.is_ok(), "Expected first message to succeed");
    }

    let _ = sender.send(Message::Close(None)).await;
}
