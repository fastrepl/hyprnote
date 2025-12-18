mod analytics;
mod config;
mod error;
mod router;
mod service;

pub use analytics::{SttAnalyticsReporter, SttEvent};
pub use config::*;
pub use error::*;
pub use router::router;
pub use service::WebSocketProxy;

#[cfg(test)]
mod tests {
    use std::collections::HashMap;
    use std::sync::{Arc, Mutex};
    use std::time::Duration;

    use futures_util::{SinkExt, StreamExt};
    use tokio_tungstenite::connect_async;
    use tokio_tungstenite::tungstenite::Message;

    use super::*;
    use owhisper_providers::Provider;

    #[derive(Default, Clone)]
    struct MockAnalytics {
        events: Arc<Mutex<Vec<SttEvent>>>,
    }

    impl SttAnalyticsReporter for MockAnalytics {
        fn report_stt(
            &self,
            event: SttEvent,
        ) -> std::pin::Pin<Box<dyn std::future::Future<Output = ()> + Send + '_>> {
            let events = self.events.clone();
            Box::pin(async move {
                events.lock().unwrap().push(event);
            })
        }
    }

    #[ignore]
    #[tokio::test]
    async fn e2e_deepgram_with_mock_analytics() {
        let api_key = std::env::var("DEEPGRAM_API_KEY").expect("DEEPGRAM_API_KEY must be set");

        let mock_analytics = MockAnalytics::default();
        let events = mock_analytics.events.clone();

        let mut api_keys = HashMap::new();
        api_keys.insert(Provider::Deepgram, api_key);

        let config = SttProxyConfig::new(api_keys)
            .with_default_provider(Provider::Deepgram)
            .with_analytics(Arc::new(mock_analytics));

        let app = router(config);

        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();

        tokio::spawn(async move {
            axum::serve(listener, app).await.unwrap();
        });

        tokio::time::sleep(Duration::from_millis(100)).await;

        let url = format!(
            "ws://{}/ws?encoding=linear16&sample_rate=16000&channels=1",
            addr
        );
        let (mut ws_stream, _) = connect_async(&url).await.expect("failed to connect");

        let audio_data = vec![0u8; 3200];
        ws_stream
            .send(Message::Binary(audio_data.into()))
            .await
            .expect("failed to send audio");

        tokio::time::sleep(Duration::from_millis(500)).await;

        let close_msg = serde_json::json!({"type": "CloseStream"});
        ws_stream
            .send(Message::Text(close_msg.to_string().into()))
            .await
            .expect("failed to send close");

        while let Some(msg) = ws_stream.next().await {
            match msg {
                Ok(Message::Close(_)) => break,
                Ok(_) => continue,
                Err(_) => break,
            }
        }

        let _ = ws_stream.close(None).await;

        tokio::time::sleep(Duration::from_secs(1)).await;

        let captured_events = events.lock().unwrap();
        assert_eq!(captured_events.len(), 1);

        let event = &captured_events[0];
        assert_eq!(event.provider, "deepgram");
        assert!(event.duration.as_secs_f64() > 0.0);
    }
}
