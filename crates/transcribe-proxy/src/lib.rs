mod analytics;
mod config;
mod error;
mod proxy;
mod router;
mod upstream_url;

pub use analytics::{SttAnalyticsReporter, SttEvent};
pub use config::*;
pub use error::*;
pub use proxy::{ClientRequestBuilder, WebSocketProxy};
pub use router::router;
pub use upstream_url::UpstreamUrlBuilder;

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
            "ws://{}/listen?encoding=linear16&sample_rate=16000&channels=1",
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

#[cfg(test)]
mod proxy_e2e {
    use std::collections::HashMap;
    use std::time::Duration;

    use futures_util::StreamExt;
    use hypr_audio_utils::AudioFormatExt;
    use owhisper_client::{DeepgramAdapter, FinalizeHandle, ListenClient};
    use owhisper_interface::ControlMessage;
    use owhisper_interface::stream::StreamResponse;
    use owhisper_providers::Provider;

    use super::*;

    type ListenClientInput = owhisper_interface::MixedMessage<bytes::Bytes, ControlMessage>;

    async fn start_proxy_server(provider: Provider, api_key: String) -> std::net::SocketAddr {
        let mut api_keys = HashMap::new();
        api_keys.insert(provider, api_key);

        let config = SttProxyConfig::new(api_keys).with_default_provider(provider);
        let app = router(config);

        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();

        tokio::spawn(async move {
            axum::serve(listener, app).await.unwrap();
        });

        tokio::time::sleep(Duration::from_millis(100)).await;
        addr
    }

    fn test_audio_stream()
    -> impl futures_util::Stream<Item = ListenClientInput> + Send + Unpin + 'static {
        let audio = rodio::Decoder::new(std::io::BufReader::new(
            std::fs::File::open(hypr_data::english_1::AUDIO_PATH).unwrap(),
        ))
        .unwrap()
        .to_i16_le_chunks(16000, 1600);

        Box::pin(tokio_stream::StreamExt::throttle(
            audio.map(|chunk| owhisper_interface::MixedMessage::Audio(chunk)),
            Duration::from_millis(100),
        ))
    }

    pub mod deepgram {
        use super::*;

        pub mod live {
            use super::*;

            #[ignore]
            #[tokio::test]
            async fn test_proxy_deepgram_live() {
                let _ = tracing_subscriber::fmt::try_init();

                let api_key =
                    std::env::var("DEEPGRAM_API_KEY").expect("DEEPGRAM_API_KEY must be set");
                let addr = start_proxy_server(Provider::Deepgram, api_key).await;

                let client: ListenClient<DeepgramAdapter> = ListenClient::builder()
                    .api_base(format!("http://{}", addr))
                    .params(owhisper_interface::ListenParams {
                        model: Some("nova-3".to_string()),
                        languages: vec![hypr_language::ISO639::En.into()],
                        ..Default::default()
                    })
                    .build_single()
                    .await;

                let input = test_audio_stream();
                let (stream, handle) = client.from_realtime_audio(input).await.unwrap();
                futures_util::pin_mut!(stream);

                let mut saw_transcript = false;
                let timeout = Duration::from_secs(30);

                let test_future = async {
                    while let Some(result) = stream.next().await {
                        match result {
                            Ok(StreamResponse::TranscriptResponse { channel, .. }) => {
                                if let Some(alt) = channel.alternatives.first() {
                                    if !alt.transcript.is_empty() {
                                        println!("[proxy:deepgram] {}", alt.transcript);
                                        saw_transcript = true;
                                    }
                                }
                            }
                            Ok(_) => {}
                            Err(e) => {
                                panic!("[proxy:deepgram] error: {:?}", e);
                            }
                        }
                    }
                };

                let _ = tokio::time::timeout(timeout, test_future).await;
                handle.finalize().await;

                assert!(
                    saw_transcript,
                    "[proxy:deepgram] expected at least one non-empty transcript"
                );
            }
        }
    }
}
