mod common;
use common::*;

use futures_util::StreamExt;
use std::time::Duration;

use owhisper_client::{FinalizeHandle, ListenClient, RealtimeSttAdapter};
use owhisper_interface::stream::StreamResponse;
use owhisper_providers::Provider;

async fn run_proxy_live_test<A: RealtimeSttAdapter>(
    provider: Provider,
    params: owhisper_interface::ListenParams,
) {
    let _ = tracing_subscriber::fmt::try_init();

    let api_key = std::env::var(provider.env_key_name())
        .unwrap_or_else(|_| panic!("{} must be set", provider.env_key_name()));
    let addr = start_server_with_provider(provider, api_key).await;

    let client = ListenClient::builder()
        .adapter::<A>()
        .api_base(format!("http://{}", addr))
        .params(params)
        .build_single()
        .await;

    let provider_name = format!("proxy:{}", provider);
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
                            println!("[{}] {}", provider_name, alt.transcript);
                            saw_transcript = true;
                        }
                    }
                }
                Ok(_) => {}
                Err(e) => {
                    panic!("[{}] error: {:?}", provider_name, e);
                }
            }
        }
    };

    let _ = tokio::time::timeout(timeout, test_future).await;
    handle.finalize().await;

    assert!(
        saw_transcript,
        "[{}] expected at least one non-empty transcript",
        provider_name
    );
}

macro_rules! proxy_live_test {
    ($name:ident, $adapter:ty, $provider:expr, $model:expr) => {
        pub mod $name {
            use super::*;

            pub mod live {
                use super::*;

                #[ignore]
                #[tokio::test]
                async fn test_proxy_live() {
                    run_proxy_live_test::<$adapter>(
                        $provider,
                        owhisper_interface::ListenParams {
                            model: Some($model.to_string()),
                            languages: vec![hypr_language::ISO639::En.into()],
                            ..Default::default()
                        },
                    )
                    .await;
                }
            }
        }
    };
}

proxy_live_test!(
    deepgram,
    owhisper_client::DeepgramAdapter,
    Provider::Deepgram,
    "nova-3"
);
proxy_live_test!(
    soniox,
    owhisper_client::SonioxAdapter,
    Provider::Soniox,
    "stt-v3"
);
