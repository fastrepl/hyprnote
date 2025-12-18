mod analytics;
mod config;
mod error;
mod handler;
mod types;

pub use analytics::{AnalyticsReporter, GenerationEvent};
pub use config::*;
pub use error::*;
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
