mod common;

use common::*;

use futures_util::StreamExt;
use std::time::Duration;

use hypr_data::wer::{WerConfig, WerResult, calculate_wer};
use owhisper_client::{BatchSttAdapter, FinalizeHandle, ListenClient, RealtimeSttAdapter};
use owhisper_interface::stream::StreamResponse;
use owhisper_providers::Provider;

pub struct MultilingualTestConfig {
    pub audio_path: &'static str,
    pub ground_truth: &'static str,
    pub languages: Vec<hypr_language::ISO639>,
    pub wer_threshold: f64,
    pub wer_config: WerConfig,
}

impl MultilingualTestConfig {
    pub fn german() -> Self {
        Self {
            audio_path: hypr_data::german_1::AUDIO_PATH,
            ground_truth: hypr_data::german_1::GROUND_TRUTH_TEXT,
            languages: vec![hypr_language::ISO639::De],
            wer_threshold: 0.3,
            wer_config: WerConfig::default_for_language("de"),
        }
    }

    pub fn korean() -> Self {
        Self {
            audio_path: hypr_data::korean_1::AUDIO_PATH,
            ground_truth: "기관 스터디 이민영 상담원입니다",
            languages: vec![hypr_language::ISO639::Ko],
            wer_threshold: 0.3,
            wer_config: WerConfig::default_for_language("ko"),
        }
    }

    pub fn mixed_en_ko() -> Self {
        Self {
            audio_path: hypr_data::mixed_en_ko_1::AUDIO_PATH,
            ground_truth: hypr_data::mixed_en_ko_1::GROUND_TRUTH_TEXT,
            languages: vec![hypr_language::ISO639::En, hypr_language::ISO639::Ko],
            wer_threshold: 0.4,
            wer_config: WerConfig::default_for_language("en"),
        }
    }
}

fn audio_stream_from_path(
    path: &str,
) -> impl futures_util::Stream<
    Item = owhisper_interface::MixedMessage<bytes::Bytes, owhisper_interface::ControlMessage>,
> + Send
+ Unpin
+ 'static {
    use hypr_audio_utils::AudioFormatExt;

    let audio = rodio::Decoder::new(std::io::BufReader::new(std::fs::File::open(path).unwrap()))
        .unwrap()
        .to_i16_le_chunks(16000, 1600);

    Box::pin(tokio_stream::StreamExt::throttle(
        audio.map(owhisper_interface::MixedMessage::Audio),
        Duration::from_millis(100),
    ))
}

async fn run_multilingual_live_test_with_wer<A: RealtimeSttAdapter>(
    provider: Provider,
    config: MultilingualTestConfig,
) -> (String, WerResult) {
    let _ = tracing_subscriber::fmt::try_init();

    let api_key = std::env::var(provider.env_key_name())
        .unwrap_or_else(|_| panic!("{} must be set", provider.env_key_name()));
    let addr = start_server_with_provider(provider, api_key).await;

    let params = owhisper_interface::ListenParams {
        model: Some(provider.default_live_model().to_string()),
        languages: config.languages.iter().map(|l| (*l).into()).collect(),
        ..Default::default()
    };

    let client = ListenClient::builder()
        .adapter::<A>()
        .api_base(format!("http://{}", addr))
        .params(params)
        .build_single()
        .await;

    let provider_name = format!("proxy:{}", provider);
    let input = audio_stream_from_path(config.audio_path);
    let (stream, handle) = client.from_realtime_audio(input).await.unwrap();
    futures_util::pin_mut!(stream);

    let mut full_transcript = String::new();
    let timeout = Duration::from_secs(60);

    let test_future = async {
        while let Some(result) = stream.next().await {
            match result {
                Ok(response) => {
                    if let StreamResponse::TranscriptResponse {
                        channel, is_final, ..
                    } = &response
                    {
                        if let Some(alt) = channel.alternatives.first() {
                            if !alt.transcript.is_empty() && *is_final {
                                println!("[{}] {}", provider_name, alt.transcript);
                                if !full_transcript.is_empty() {
                                    full_transcript.push(' ');
                                }
                                full_transcript.push_str(&alt.transcript);
                            }
                        }
                    }
                }
                Err(e) => {
                    panic!("[{}] error: {:?}", provider_name, e);
                }
            }
        }
    };

    let _ = tokio::time::timeout(timeout, test_future).await;
    handle.finalize().await;

    let wer_result = calculate_wer(config.ground_truth, &full_transcript, &config.wer_config);

    println!(
        "[{}] WER: {:.2}% (S:{}, I:{}, D:{}, Ref:{}, Hyp:{})",
        provider_name,
        wer_result.wer * 100.0,
        wer_result.substitutions,
        wer_result.insertions,
        wer_result.deletions,
        wer_result.reference_words,
        wer_result.hypothesis_words
    );

    (full_transcript, wer_result)
}

async fn run_multilingual_batch_test_with_wer<A: BatchSttAdapter>(
    provider: Provider,
    config: MultilingualTestConfig,
) -> (String, WerResult) {
    let _ = tracing_subscriber::fmt::try_init();

    let api_key = std::env::var(provider.env_key_name())
        .unwrap_or_else(|_| panic!("{} must be set", provider.env_key_name()));
    let addr = start_server_with_provider(provider, api_key).await;

    let audio_bytes = std::fs::read(config.audio_path).expect("failed to read test audio file");

    let params = owhisper_interface::ListenParams {
        model: Some(provider.default_batch_model().to_string()),
        languages: config.languages.iter().map(|l| (*l).into()).collect(),
        ..Default::default()
    };

    let client = reqwest::Client::new();
    let url = format!(
        "http://{}/listen?model={}",
        addr,
        params
            .model
            .as_deref()
            .unwrap_or(provider.default_batch_model())
    );

    let response = client
        .post(&url)
        .header("Content-Type", "audio/wav")
        .body(audio_bytes)
        .send()
        .await
        .expect("failed to send batch request");

    assert!(
        response.status().is_success(),
        "batch request failed with status: {}",
        response.status()
    );

    let batch_response: owhisper_interface::batch::Response = response
        .json()
        .await
        .expect("failed to parse batch response");

    let transcript = batch_response
        .results
        .channels
        .first()
        .and_then(|c| c.alternatives.first())
        .map(|a| a.transcript.clone())
        .unwrap_or_default();

    let provider_name = format!("proxy:{}", provider);
    println!("[{}] batch transcript: {}", provider_name, transcript);

    let wer_result = calculate_wer(config.ground_truth, &transcript, &config.wer_config);

    println!(
        "[{}] WER: {:.2}% (S:{}, I:{}, D:{}, Ref:{}, Hyp:{})",
        provider_name,
        wer_result.wer * 100.0,
        wer_result.substitutions,
        wer_result.insertions,
        wer_result.deletions,
        wer_result.reference_words,
        wer_result.hypothesis_words
    );

    (transcript, wer_result)
}

macro_rules! multilingual_live_test {
    ($name:ident, $adapter:ty, $provider:expr, $config_fn:ident, $threshold:expr) => {
        pub mod $name {
            use super::*;

            #[ignore]
            #[tokio::test]
            async fn test_multilingual_live_wer() {
                let config = MultilingualTestConfig::$config_fn();
                let (transcript, wer_result) =
                    run_multilingual_live_test_with_wer::<$adapter>($provider, config).await;

                assert!(
                    !transcript.is_empty(),
                    "[proxy:{}] expected non-empty transcript",
                    $provider
                );

                assert!(
                    wer_result.is_acceptable($threshold),
                    "[proxy:{}] WER {:.2}% exceeds threshold {:.2}%",
                    $provider,
                    wer_result.wer * 100.0,
                    $threshold * 100.0
                );
            }
        }
    };
}

macro_rules! multilingual_batch_test {
    ($name:ident, $adapter:ty, $provider:expr, $config_fn:ident, $threshold:expr) => {
        pub mod $name {
            use super::*;

            #[ignore]
            #[tokio::test]
            async fn test_multilingual_batch_wer() {
                let config = MultilingualTestConfig::$config_fn();
                let (transcript, wer_result) =
                    run_multilingual_batch_test_with_wer::<$adapter>($provider, config).await;

                assert!(
                    !transcript.is_empty(),
                    "[proxy:{}] expected non-empty transcript",
                    $provider
                );

                assert!(
                    wer_result.is_acceptable($threshold),
                    "[proxy:{}] WER {:.2}% exceeds threshold {:.2}%",
                    $provider,
                    wer_result.wer * 100.0,
                    $threshold * 100.0
                );
            }
        }
    };
}

mod multilingual_e2e {
    use super::*;

    mod german {
        use super::*;

        multilingual_live_test!(
            deepgram_german,
            owhisper_client::DeepgramAdapter,
            Provider::Deepgram,
            german,
            0.3
        );

        multilingual_live_test!(
            soniox_german,
            owhisper_client::SonioxAdapter,
            Provider::Soniox,
            german,
            0.3
        );

        multilingual_batch_test!(
            deepgram_german_batch,
            owhisper_client::DeepgramAdapter,
            Provider::Deepgram,
            german,
            0.3
        );
    }

    mod korean {
        use super::*;

        multilingual_live_test!(
            deepgram_korean,
            owhisper_client::DeepgramAdapter,
            Provider::Deepgram,
            korean,
            0.3
        );

        multilingual_live_test!(
            soniox_korean,
            owhisper_client::SonioxAdapter,
            Provider::Soniox,
            korean,
            0.3
        );

        multilingual_batch_test!(
            deepgram_korean_batch,
            owhisper_client::DeepgramAdapter,
            Provider::Deepgram,
            korean,
            0.3
        );
    }

    mod mixed_en_ko {
        use super::*;

        multilingual_live_test!(
            soniox_mixed_en_ko,
            owhisper_client::SonioxAdapter,
            Provider::Soniox,
            mixed_en_ko,
            0.4
        );

        multilingual_batch_test!(
            soniox_mixed_en_ko_batch,
            owhisper_client::SonioxAdapter,
            Provider::Soniox,
            mixed_en_ko,
            0.4
        );
    }
}
