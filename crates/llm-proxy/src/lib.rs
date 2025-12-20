mod analytics;
mod config;
mod handler;
mod types;

pub use analytics::{AnalyticsReporter, GenerationEvent};
pub use config::*;
pub use handler::router;

#[cfg(test)]
mod tests {
    use std::sync::{Arc, Mutex};

    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use tower::ServiceExt;

    use super::*;

    #[derive(Default, Clone)]
    struct MockAnalytics {
        events: Arc<Mutex<Vec<GenerationEvent>>>,
    }

    impl AnalyticsReporter for MockAnalytics {
        fn report_generation(
            &self,
            event: GenerationEvent,
        ) -> std::pin::Pin<Box<dyn std::future::Future<Output = ()> + Send + '_>> {
            let events = self.events.clone();
            Box::pin(async move {
                events.lock().unwrap().push(event);
            })
        }
    }

    #[tokio::test]
    async fn replay_completions_non_stream() {
        use wiremock::matchers::{header, method, path};
        use wiremock::{Mock, MockServer, ResponseTemplate};

        let mock_server = MockServer::start().await;

        let mock_response = serde_json::json!({
            "id": "gen-test-123",
            "model": "openai/gpt-4.1-nano",
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": "hello"
                    },
                    "finish_reason": "stop"
                }
            ],
            "usage": {
                "prompt_tokens": 10,
                "completion_tokens": 1
            }
        });

        Mock::given(method("POST"))
            .and(path("/"))
            .and(header("Authorization", "Bearer test-api-key"))
            .and(header("Content-Type", "application/json"))
            .respond_with(
                ResponseTemplate::new(200)
                    .set_body_json(&mock_response)
                    .insert_header("Content-Type", "application/json"),
            )
            .expect(1)
            .mount(&mock_server)
            .await;

        let mock_analytics = MockAnalytics::default();
        let events = mock_analytics.events.clone();

        let config = LlmProxyConfig::new("test-api-key")
            .with_base_url(mock_server.uri())
            .with_models_default(vec!["openai/gpt-4.1-nano".into()])
            .with_analytics(Arc::new(mock_analytics));

        let app = router(config);

        let request_body = serde_json::json!({
            "messages": [
                {"role": "user", "content": "Say 'hello' and nothing else."}
            ],
            "max_tokens": 10
        });

        let request = Request::builder()
            .method("POST")
            .uri("/completions")
            .header("Content-Type", "application/json")
            .body(Body::from(serde_json::to_string(&request_body).unwrap()))
            .unwrap();

        let response = app.oneshot(request).await.unwrap();

        assert_eq!(response.status(), StatusCode::OK);

        let body_bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap();
        let body: serde_json::Value = serde_json::from_slice(&body_bytes).unwrap();

        assert_eq!(body["id"], "gen-test-123");
        assert_eq!(body["model"], "openai/gpt-4.1-nano");
        assert_eq!(body["choices"][0]["message"]["content"], "hello");

        tokio::time::sleep(std::time::Duration::from_millis(100)).await;

        let captured_events = events.lock().unwrap();
        assert_eq!(captured_events.len(), 1);

        let event = &captured_events[0];
        assert_eq!(event.generation_id, "gen-test-123");
        assert_eq!(event.model, "openai/gpt-4.1-nano");
        assert_eq!(event.http_status, 200);
        assert_eq!(event.input_tokens, 10);
        assert_eq!(event.output_tokens, 1);
        assert!(event.latency > 0.0);
    }

    #[tokio::test]
    async fn replay_completions_stream() {
        use wiremock::matchers::{header, method, path};
        use wiremock::{Mock, MockServer, ResponseTemplate};

        let mock_server = MockServer::start().await;

        let stream_response = [
            r#"data: {"id":"gen-stream-456","model":"openai/gpt-4.1-nano","choices":[{"index":0,"delta":{"role":"assistant","content":""},"finish_reason":null}]}"#,
            r#"data: {"id":"gen-stream-456","model":"openai/gpt-4.1-nano","choices":[{"index":0,"delta":{"content":"hello"},"finish_reason":null}]}"#,
            r#"data: {"id":"gen-stream-456","model":"openai/gpt-4.1-nano","choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":8,"completion_tokens":1}}"#,
            "data: [DONE]",
        ]
        .join("\n\n");

        Mock::given(method("POST"))
            .and(path("/"))
            .and(header("Authorization", "Bearer test-api-key"))
            .respond_with(
                ResponseTemplate::new(200)
                    .set_body_string(&stream_response)
                    .insert_header("Content-Type", "text/event-stream"),
            )
            .expect(1)
            .mount(&mock_server)
            .await;

        let mock_analytics = MockAnalytics::default();
        let events = mock_analytics.events.clone();

        let config = LlmProxyConfig::new("test-api-key")
            .with_base_url(mock_server.uri())
            .with_models_default(vec!["openai/gpt-4.1-nano".into()])
            .with_analytics(Arc::new(mock_analytics));

        let app = router(config);

        let request_body = serde_json::json!({
            "messages": [
                {"role": "user", "content": "Say 'hello' and nothing else."}
            ],
            "stream": true,
            "max_tokens": 10
        });

        let request = Request::builder()
            .method("POST")
            .uri("/completions")
            .header("Content-Type", "application/json")
            .body(Body::from(serde_json::to_string(&request_body).unwrap()))
            .unwrap();

        let response = app.oneshot(request).await.unwrap();

        assert_eq!(response.status(), StatusCode::OK);
        assert_eq!(
            response.headers().get("Content-Type").unwrap(),
            "text/event-stream"
        );

        let body_bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap();
        let body_str = String::from_utf8_lossy(&body_bytes);

        assert!(body_str.contains("data: "));
        assert!(body_str.contains("gen-stream-456"));
        assert!(body_str.contains("[DONE]"));

        tokio::time::sleep(std::time::Duration::from_millis(100)).await;

        let captured_events = events.lock().unwrap();
        assert_eq!(captured_events.len(), 1);

        let event = &captured_events[0];
        assert_eq!(event.generation_id, "gen-stream-456");
        assert_eq!(event.model, "openai/gpt-4.1-nano");
        assert_eq!(event.http_status, 200);
        assert_eq!(event.input_tokens, 8);
        assert_eq!(event.output_tokens, 1);
        assert!(event.latency > 0.0);
    }

    #[tokio::test]
    async fn replay_completions_with_tools_uses_tool_calling_models() {
        use wiremock::matchers::{body_partial_json, header, method, path};
        use wiremock::{Mock, MockServer, ResponseTemplate};

        let mock_server = MockServer::start().await;

        let mock_response = serde_json::json!({
            "id": "gen-tools-789",
            "model": "anthropic/claude-haiku-4.5",
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": null,
                        "tool_calls": [
                            {
                                "id": "call_123",
                                "type": "function",
                                "function": {
                                    "name": "get_weather",
                                    "arguments": "{\"location\":\"San Francisco\"}"
                                }
                            }
                        ]
                    },
                    "finish_reason": "tool_calls"
                }
            ],
            "usage": {
                "prompt_tokens": 50,
                "completion_tokens": 20
            }
        });

        Mock::given(method("POST"))
            .and(path("/"))
            .and(header("Authorization", "Bearer test-api-key"))
            .and(body_partial_json(serde_json::json!({
                "models": ["anthropic/claude-haiku-4.5"]
            })))
            .respond_with(
                ResponseTemplate::new(200)
                    .set_body_json(&mock_response)
                    .insert_header("Content-Type", "application/json"),
            )
            .expect(1)
            .mount(&mock_server)
            .await;

        let mock_analytics = MockAnalytics::default();
        let events = mock_analytics.events.clone();

        let config = LlmProxyConfig::new("test-api-key")
            .with_base_url(mock_server.uri())
            .with_models_default(vec!["openai/gpt-4.1-nano".into()])
            .with_models_tool_calling(vec!["anthropic/claude-haiku-4.5".into()])
            .with_analytics(Arc::new(mock_analytics));

        let app = router(config);

        let request_body = serde_json::json!({
            "messages": [
                {"role": "user", "content": "What's the weather in San Francisco?"}
            ],
            "tools": [
                {
                    "type": "function",
                    "function": {
                        "name": "get_weather",
                        "description": "Get the weather for a location",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "location": {"type": "string"}
                            },
                            "required": ["location"]
                        }
                    }
                }
            ],
            "max_tokens": 100
        });

        let request = Request::builder()
            .method("POST")
            .uri("/completions")
            .header("Content-Type", "application/json")
            .body(Body::from(serde_json::to_string(&request_body).unwrap()))
            .unwrap();

        let response = app.oneshot(request).await.unwrap();

        assert_eq!(response.status(), StatusCode::OK);

        let body_bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap();
        let body: serde_json::Value = serde_json::from_slice(&body_bytes).unwrap();

        assert_eq!(body["id"], "gen-tools-789");
        assert!(body["choices"][0]["message"]["tool_calls"].is_array());

        tokio::time::sleep(std::time::Duration::from_millis(100)).await;

        let captured_events = events.lock().unwrap();
        assert_eq!(captured_events.len(), 1);

        let event = &captured_events[0];
        assert_eq!(event.generation_id, "gen-tools-789");
        assert_eq!(event.model, "anthropic/claude-haiku-4.5");
        assert_eq!(event.input_tokens, 50);
        assert_eq!(event.output_tokens, 20);
    }

    #[tokio::test]
    async fn replay_completions_upstream_error() {
        use wiremock::matchers::{header, method, path};
        use wiremock::{Mock, MockServer, ResponseTemplate};

        let mock_server = MockServer::start().await;

        let error_response = serde_json::json!({
            "error": {
                "message": "Rate limit exceeded",
                "type": "rate_limit_error",
                "code": "rate_limit_exceeded"
            }
        });

        Mock::given(method("POST"))
            .and(path("/"))
            .and(header("Authorization", "Bearer test-api-key"))
            .respond_with(
                ResponseTemplate::new(429)
                    .set_body_json(&error_response)
                    .insert_header("Content-Type", "application/json"),
            )
            .expect(1)
            .mount(&mock_server)
            .await;

        let config = LlmProxyConfig::new("test-api-key")
            .with_base_url(mock_server.uri())
            .with_models_default(vec!["openai/gpt-4.1-nano".into()]);

        let app = router(config);

        let request_body = serde_json::json!({
            "messages": [
                {"role": "user", "content": "Hello"}
            ]
        });

        let request = Request::builder()
            .method("POST")
            .uri("/completions")
            .header("Content-Type", "application/json")
            .body(Body::from(serde_json::to_string(&request_body).unwrap()))
            .unwrap();

        let response = app.oneshot(request).await.unwrap();

        assert_eq!(response.status().as_u16(), 429);

        let body_bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap();
        let body: serde_json::Value = serde_json::from_slice(&body_bytes).unwrap();

        assert!(
            body["error"]["message"]
                .as_str()
                .unwrap()
                .contains("Rate limit")
        );
    }

    #[tokio::test]
    async fn replay_completions_request_transformation() {
        use wiremock::matchers::{body_partial_json, header, method, path};
        use wiremock::{Mock, MockServer, ResponseTemplate};

        let mock_server = MockServer::start().await;

        let mock_response = serde_json::json!({
            "id": "gen-transform-test",
            "model": "openai/gpt-4.1-nano",
            "choices": [{"index": 0, "message": {"role": "assistant", "content": "test"}, "finish_reason": "stop"}],
            "usage": {"prompt_tokens": 5, "completion_tokens": 1}
        });

        Mock::given(method("POST"))
            .and(path("/"))
            .and(header("Authorization", "Bearer test-api-key"))
            .and(body_partial_json(serde_json::json!({
                "messages": [{"role": "user", "content": "test message"}],
                "stream": false,
                "models": ["openai/gpt-4.1-nano"],
                "temperature": 0.7,
                "max_tokens": 50,
                "provider": {"sort": "latency"}
            })))
            .respond_with(
                ResponseTemplate::new(200)
                    .set_body_json(&mock_response)
                    .insert_header("Content-Type", "application/json"),
            )
            .expect(1)
            .mount(&mock_server)
            .await;

        let config = LlmProxyConfig::new("test-api-key")
            .with_base_url(mock_server.uri())
            .with_models_default(vec!["openai/gpt-4.1-nano".into()]);

        let app = router(config);

        let request_body = serde_json::json!({
            "messages": [{"role": "user", "content": "test message"}],
            "temperature": 0.7,
            "max_tokens": 50
        });

        let request = Request::builder()
            .method("POST")
            .uri("/completions")
            .header("Content-Type", "application/json")
            .body(Body::from(serde_json::to_string(&request_body).unwrap()))
            .unwrap();

        let response = app.oneshot(request).await.unwrap();

        assert_eq!(response.status(), StatusCode::OK);
    }

    #[ignore]
    #[tokio::test]
    async fn e2e_completions_with_mock_analytics() {
        let api_key = std::env::var("OPENROUTER_API_KEY").expect("OPENROUTER_API_KEY must be set");

        let mock_analytics = MockAnalytics::default();
        let events = mock_analytics.events.clone();

        let config = LlmProxyConfig::new(api_key)
            .with_models_default(vec!["openai/gpt-4.1-nano".into()])
            .with_analytics(Arc::new(mock_analytics));

        let app = router(config);

        let request_body = serde_json::json!({
            "messages": [
                {"role": "user", "content": "Say 'hello' and nothing else."}
            ],
            "max_tokens": 10
        });

        let request = Request::builder()
            .method("POST")
            .uri("/completions")
            .header("Content-Type", "application/json")
            .body(Body::from(serde_json::to_string(&request_body).unwrap()))
            .unwrap();

        let response = app.oneshot(request).await.unwrap();

        assert_eq!(response.status(), StatusCode::OK);

        let body_bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap();
        let body: serde_json::Value = serde_json::from_slice(&body_bytes).unwrap();

        assert!(body.get("id").is_some());
        assert!(body.get("choices").is_some());

        tokio::time::sleep(std::time::Duration::from_secs(3)).await;

        let captured_events = events.lock().unwrap();
        assert_eq!(captured_events.len(), 1);

        let event = &captured_events[0];
        assert!(!event.generation_id.is_empty());
        assert!(!event.model.is_empty());
        assert_eq!(event.http_status, 200);
        assert!(event.input_tokens > 0);
        assert!(event.output_tokens > 0);
        assert!(event.latency > 0.0);
    }

    #[ignore]
    #[tokio::test]
    async fn e2e_completions_stream_with_mock_analytics() {
        let api_key = std::env::var("OPENROUTER_API_KEY").expect("OPENROUTER_API_KEY must be set");

        let mock_analytics = MockAnalytics::default();
        let events = mock_analytics.events.clone();

        let config = LlmProxyConfig::new(api_key)
            .with_models_default(vec!["openai/gpt-4.1-nano".into()])
            .with_analytics(Arc::new(mock_analytics));

        let app = router(config);

        let request_body = serde_json::json!({
            "messages": [
                {"role": "user", "content": "Say 'hello' and nothing else."}
            ],
            "stream": true,
            "max_tokens": 10
        });

        let request = Request::builder()
            .method("POST")
            .uri("/completions")
            .header("Content-Type", "application/json")
            .body(Body::from(serde_json::to_string(&request_body).unwrap()))
            .unwrap();

        let response = app.oneshot(request).await.unwrap();

        assert_eq!(response.status(), StatusCode::OK);

        let body_bytes = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .unwrap();
        let body_str = String::from_utf8_lossy(&body_bytes);

        assert!(body_str.contains("data: "));

        tokio::time::sleep(std::time::Duration::from_secs(3)).await;

        let captured_events = events.lock().unwrap();
        assert_eq!(captured_events.len(), 1);

        let event = &captured_events[0];
        assert!(!event.generation_id.is_empty());
        assert!(!event.model.is_empty());
        assert_eq!(event.http_status, 200);
        assert!(event.latency > 0.0);
    }
}
