use std::time::Duration;

use futures_util::{Stream, StreamExt};
use hypr_audio_utils::AudioFormatExt;
use owhisper_interface::stream::StreamResponse;
use owhisper_interface::MixedMessage;

use crate::live::{FinalizeHandle, ListenClientDualInput, ListenClientInput};
use crate::{ListenClient, ListenClientDual, RealtimeSttAdapter};

#[macro_export]
macro_rules! adapter_integration_tests {
    (
        adapter: $adapter:ty,
        provider: $provider:expr,
        api_base: $api_base:expr,
        api_key_env: $api_key_env:expr,
        params: $params:expr
    ) => {
        #[tokio::test]
        #[ignore]
        async fn test_build_single() {
            let api_key = if $api_key_env.is_empty() {
                String::new()
            } else {
                std::env::var($api_key_env).expect(concat!($api_key_env, " not set"))
            };

            let client = $crate::ListenClient::builder()
                .adapter::<$adapter>()
                .api_base($api_base)
                .api_key(api_key)
                .params($params)
                .build_single();

            $crate::test_utils::run_single_test(client, $provider).await;
        }

        #[tokio::test]
        #[ignore]
        async fn test_build_dual() {
            let api_key = if $api_key_env.is_empty() {
                String::new()
            } else {
                std::env::var($api_key_env).expect(concat!($api_key_env, " not set"))
            };

            let client = $crate::ListenClient::builder()
                .adapter::<$adapter>()
                .api_base($api_base)
                .api_key(api_key)
                .params($params)
                .build_dual();

            $crate::test_utils::run_dual_test(client, $provider).await;
        }
    };
}

fn timeout_secs() -> u64 {
    std::env::var("TEST_TIMEOUT_SECS")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(10)
}

fn throttle_ms() -> u64 {
    100
}

fn chunk_samples() -> usize {
    1600
}

fn sample_rate() -> u32 {
    16000
}

pub fn test_audio_stream_single() -> impl Stream<Item = ListenClientInput> + Send + Unpin + 'static
{
    let audio = rodio::Decoder::new(std::io::BufReader::new(
        std::fs::File::open(hypr_data::english_1::AUDIO_PATH).unwrap(),
    ))
    .unwrap()
    .to_i16_le_chunks(sample_rate(), chunk_samples());

    Box::pin(tokio_stream::StreamExt::throttle(
        audio.map(|chunk| MixedMessage::Audio(chunk)),
        Duration::from_millis(throttle_ms()),
    ))
}

pub fn test_audio_stream_dual() -> impl Stream<Item = ListenClientDualInput> + Send + Unpin + 'static
{
    let audio = rodio::Decoder::new(std::io::BufReader::new(
        std::fs::File::open(hypr_data::english_1::AUDIO_PATH).unwrap(),
    ))
    .unwrap()
    .to_i16_le_chunks(sample_rate(), chunk_samples());

    Box::pin(tokio_stream::StreamExt::throttle(
        audio.map(|chunk| MixedMessage::Audio((chunk.clone(), chunk))),
        Duration::from_millis(throttle_ms()),
    ))
}

pub async fn run_single_test<A: RealtimeSttAdapter>(client: ListenClient<A>, provider_name: &str) {
    let _ = tracing_subscriber::fmt::try_init();

    let timeout = Duration::from_secs(timeout_secs());
    let input = test_audio_stream_single();
    let (stream, handle) = client.from_realtime_audio(input).await.unwrap();
    futures_util::pin_mut!(stream);

    let mut saw_transcript = false;

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

pub async fn run_dual_test<A: RealtimeSttAdapter>(
    client: ListenClientDual<A>,
    provider_name: &str,
) {
    let _ = tracing_subscriber::fmt::try_init();

    let timeout = Duration::from_secs(timeout_secs());
    let input = test_audio_stream_dual();
    let (stream, handle) = client.from_realtime_audio(input).await.unwrap();
    futures_util::pin_mut!(stream);

    let mut saw_transcript = false;

    let test_future = async {
        while let Some(result) = stream.next().await {
            match result {
                Ok(StreamResponse::TranscriptResponse {
                    channel,
                    channel_index,
                    ..
                }) => {
                    if let Some(alt) = channel.alternatives.first() {
                        if !alt.transcript.is_empty() {
                            println!(
                                "[{}] ch{}: {}",
                                provider_name,
                                channel_index.first().unwrap_or(&0),
                                alt.transcript
                            );
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
