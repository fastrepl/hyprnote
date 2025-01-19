use anyhow::Result;
use bytes::Bytes;
use futures_core::{Future,Stream};
use std::error::Error;

use hypr_clova::interface::KeywordBoosting;

#[cfg(debug_assertions)]
mod mock;

mod clova;
pub use clova::{ClovaClient, ClovaConfig};

mod deep;
pub use deep::{DeepgramClient, DeepgramConfig};

#[allow(dead_code)]
pub trait RealtimeSpeechToText<S, E> {
    fn transcribe(
        &mut self,
        stream: S,
    ) -> impl Future<Output = Result<impl Stream<Item = Result<StreamResponse>>>>
    where
        S: Stream<Item = Result<Bytes, E>> + Send + Unpin + 'static,
        E: Error + Send + Sync + 'static;
}

#[derive(Debug)]
pub struct StreamResponse {
    pub text: String,
    pub start: f64,
    pub end: f64,
}

#[derive(Debug, Clone)]
pub struct Client {
    config: Config,
}

#[derive(Debug, Clone)]
pub struct Config {
    pub deepgram_api_key: String,
    pub clova_api_key: String,
}

impl Client {
    pub fn new(config: Config) -> Self {
        Self { config }
    }

    #[cfg(debug_assertions)]
    pub fn for_mock(&self) -> mock::MockClient {
        mock::MockClient::new()
    }

    pub async fn for_korean(&self) -> ClovaClient {
        let config = ClovaConfig {
            secret_key: self.config.clova_api_key.clone(),
            config: clova::clova::ConfigRequest {
                transcription: clova::clova::Transcription {
                    language: clova::clova::Language::Korean,
                },
                keyword_boosting: vec![KeywordBoosting {
                    words: "하이퍼노트".to_string(),
                    boost: 1.0,
                }],
            },
        };
        ClovaClient::new(config).await.unwrap()
    }

    pub fn for_english(&self) -> DeepgramClient {
        let config = DeepgramConfig {
            api_key: self.config.deepgram_api_key.clone(),
        };
        DeepgramClient::new(config)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serial_test::serial;

    use anyhow::Result;
    use bytes::{BufMut, Bytes};
    use futures_util::StreamExt;
    use kalosm_sound::AsyncSource;

    fn microphone_as_stream(
    ) -> impl Stream<Item = Result<Bytes, std::io::Error>> + Send + Unpin + 'static {
        let mic_input = kalosm_sound::MicInput::default();
        let mic_stream = mic_input.stream().unwrap().resample(16 * 1000).chunks(128);

        mic_stream.map(|chunk| {
            let mut buf = bytes::BytesMut::with_capacity(chunk.len() * 4);
            for sample in chunk {
                let scaled = (sample * 32767.0).clamp(-32768.0, 32767.0);
                buf.put_i16_le(scaled as i16);
            }
            Ok(buf.freeze())
        })
    }

    // cargo test test_mock -p stt --  --ignored --nocapture
    #[ignore]
    #[tokio::test]
    #[serial]
    async fn test_mock() {
        let audio_stream = microphone_as_stream();

        let mut client = mock::MockClient::new();
        let mut transcript_stream = client.transcribe(audio_stream).await.unwrap();

        while let Some(result) = transcript_stream.next().await {
            println!("mock: {:?}", result.unwrap());
        }
    }

    // cargo test test_deepgram -p stt --  --ignored --nocapture
    #[ignore]
    #[tokio::test]
    #[serial]
    async fn test_deepgram() {
        let audio_stream = microphone_as_stream();

        let config = DeepgramConfig {
            api_key: std::env::var("DEEPGRAM_API_KEY").unwrap(),
        };
        let mut client = DeepgramClient::new(config);
        let mut transcript_stream = client.transcribe(audio_stream).await.unwrap();

        while let Some(result) = transcript_stream.next().await {
            println!("deepgram: {:?}", result.unwrap());
        }
    }

    // cargo test test_clova -p stt --  --ignored --nocapture
    #[ignore]
    #[tokio::test]
    #[serial]
    async fn test_clova() {
        let audio_stream = microphone_as_stream();

        let config = ClovaConfig {
            secret_key: std::env::var("CLOVA_API_KEY").unwrap(),
            config: clova::clova::ConfigRequest {
                transcription: clova::clova::Transcription {
                    language: clova::clova::Language::Korean,
                },
                keyword_boosting: vec![],
            },
        };

        let mut client = ClovaClient::new(config).await.unwrap();
        let mut transcript_stream = client.transcribe(audio_stream).await.unwrap();

        while let Some(result) = transcript_stream.next().await {
            println!("clova: {:?}", result.unwrap());
        }
    }
}
