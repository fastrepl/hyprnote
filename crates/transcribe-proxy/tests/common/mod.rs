#![allow(dead_code)]

pub mod fixtures;
pub mod mock_upstream;
pub mod recording;

#[allow(unused_imports)]
pub use fixtures::load_fixture;
#[allow(unused_imports)]
pub use mock_upstream::{MockServerHandle, MockUpstreamConfig, start_mock_server_with_config};
#[allow(unused_imports)]
pub use recording::{Direction, MessageKind, WsMessage, WsRecording};

use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use futures_util::StreamExt;
use owhisper_client::Provider;
use transcribe_proxy::{
    HyprnoteRoutingConfig, SttAnalyticsReporter, SttEvent, SttProxyConfig, router,
};

#[derive(Default, Clone)]
pub struct MockAnalytics {
    pub events: Arc<Mutex<Vec<SttEvent>>>,
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

pub async fn start_server(config: SttProxyConfig) -> SocketAddr {
    let app = router(config);
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();

    tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });

    tokio::time::sleep(Duration::from_millis(100)).await;
    addr
}

pub async fn start_server_with_provider(provider: Provider, api_key: String) -> SocketAddr {
    let mut api_keys = HashMap::new();
    api_keys.insert(provider, api_key.clone());

    let config = SttProxyConfig::new(api_keys)
        .with_default_provider(provider)
        .with_hyprnote_routing(HyprnoteRoutingConfig::default());
    start_server(config).await
}

pub async fn start_server_with_upstream_url(provider: Provider, upstream_url: &str) -> SocketAddr {
    let mut api_keys = HashMap::new();
    api_keys.insert(provider, "mock-api-key".to_string());

    let config = SttProxyConfig::new(api_keys)
        .with_default_provider(provider)
        .with_upstream_url(provider, upstream_url);

    start_server(config).await
}

pub fn test_audio_stream() -> impl futures_util::Stream<
    Item = owhisper_interface::MixedMessage<bytes::Bytes, owhisper_interface::ControlMessage>,
> + Send
+ Unpin
+ 'static {
    test_audio_stream_with_rate(16000)
}

pub fn test_audio_stream_with_rate(
    sample_rate: u32,
) -> impl futures_util::Stream<
    Item = owhisper_interface::MixedMessage<bytes::Bytes, owhisper_interface::ControlMessage>,
> + Send
+ Unpin
+ 'static {
    use hypr_audio_utils::AudioFormatExt;

    // chunk_samples should be proportional to sample_rate to maintain 100ms chunks
    let chunk_samples = (sample_rate / 10) as usize;

    let audio = rodio::Decoder::new(std::io::BufReader::new(
        std::fs::File::open(hypr_data::english_1::AUDIO_PATH).unwrap(),
    ))
    .unwrap()
    .to_i16_le_chunks(sample_rate, chunk_samples);

    Box::pin(tokio_stream::StreamExt::throttle(
        audio.map(owhisper_interface::MixedMessage::Audio),
        Duration::from_millis(100),
    ))
}
