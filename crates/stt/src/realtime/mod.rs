use anyhow::Result;
use bytes::Bytes;
use futures_core::{Future, Stream};
use std::error::Error;

#[cfg(debug_assertions)]
mod mock;

mod clova;
mod deepgram;

use crate::deepgram::DeepgramClient;

#[allow(dead_code)]
pub trait RealtimeSpeechToText<S, E> {
    fn transcribe(
        &mut self,
        stream: S,
    ) -> impl Future<Output = Result<Box<dyn Stream<Item = Result<StreamResponse>> + Send + Unpin>>>
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

#[derive(Debug, Default)]
pub struct ClientBuilder {
    pub deepgram_api_key: Option<String>,
    pub clova_api_key: Option<String>,
}

impl ClientBuilder {
    pub fn deepgram_api_key(mut self, api_key: impl Into<String>) -> Self {
        self.deepgram_api_key = Some(api_key.into());
        self
    }

    pub fn clova_api_key(mut self, api_key: impl Into<String>) -> Self {
        self.clova_api_key = Some(api_key.into());
        self
    }

    pub fn build(self) -> Client {
        Client {
            deepgram_api_key: self.deepgram_api_key.unwrap(),
            clova_api_key: self.clova_api_key.unwrap(),
        }
    }
}

#[derive(Debug)]
pub enum MultiClient {
    Deepgram(DeepgramClient),
    Clova(hypr_clova::realtime::Client),
}

#[derive(Debug, Clone)]
pub struct Client {
    pub deepgram_api_key: String,
    pub clova_api_key: String,
}

impl Client {
    pub fn builder() -> ClientBuilder {
        ClientBuilder::default()
    }

    #[cfg(debug_assertions)]
    pub fn for_mock(&self) -> mock::MockClient {
        mock::MockClient::new()
    }

    pub async fn for_language(&self, language: codes_iso_639::part_1::LanguageCode) -> MultiClient {
        match language {
            codes_iso_639::part_1::LanguageCode::Ko => {
                let clova = hypr_clova::realtime::Client::builder()
                    .api_key(&self.clova_api_key)
                    .keywords(vec!["하이퍼노트".to_string()])
                    .build()
                    .await
                    .unwrap();
                MultiClient::Clova(clova)
            }
            codes_iso_639::part_1::LanguageCode::En => {
                let deepgram = DeepgramClient::builder()
                    .api_key(&self.deepgram_api_key)
                    .keywords(vec!["Hyprnote".to_string()])
                    .language(language)
                    .build();

                MultiClient::Deepgram(deepgram)
            }
            _ => panic!("Unsupported language: {:?}", language),
        }
    }
}

impl<S, E> RealtimeSpeechToText<S, E> for MultiClient
where
    S: Stream<Item = Result<Bytes, E>> + Send + Unpin + 'static,
    E: Error + Send + Sync + 'static,
{
    async fn transcribe(
        &mut self,
        stream: S,
    ) -> Result<Box<dyn Stream<Item = Result<StreamResponse>> + Send + Unpin>> {
        match self {
            MultiClient::Deepgram(client) => Ok(Box::new(client.transcribe(stream).await?)),
            MultiClient::Clova(client) => Ok(Box::new(client.transcribe(stream).await?)),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serial_test::serial;

    use anyhow::Result;
    use bytes::{BufMut, Bytes};
    use futures_util::StreamExt;
    use hypr_audio::AsyncSource;

    fn microphone_as_stream(
    ) -> impl Stream<Item = Result<Bytes, std::io::Error>> + Send + Unpin + 'static {
        let source = hypr_audio::MicInput::default();
        let stream = source.stream().unwrap().resample(16 * 1000).chunks(128);

        stream.map(|chunk| {
            let mut buf = bytes::BytesMut::with_capacity(chunk.len() * 4);
            for sample in chunk {
                let scaled = (sample * 32767.0).clamp(-32768.0, 32767.0);
                buf.put_i16_le(scaled as i16);
            }
            Ok(buf.freeze())
        })
    }

    fn system_audio_as_stream(
    ) -> impl Stream<Item = Result<Bytes, std::io::Error>> + Send + Unpin + 'static {
        let source = hypr_audio::SpeakerInput::new().unwrap();
        let stream = source.stream().unwrap().resample(16 * 1000).chunks(128);

        stream.map(|chunk| {
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
            println!("mock: {:?}", result);
        }
    }

    // cargo test test_deepgram -p stt --  --ignored --nocapture
    #[ignore]
    #[tokio::test]
    #[serial]
    async fn test_deepgram() {
        let audio_stream = microphone_as_stream();

        let mut client = DeepgramClient::builder()
            .api_key(std::env::var("DEEPGRAM_API_KEY").unwrap())
            .language(codes_iso_639::part_1::LanguageCode::En)
            .build();
        let mut transcript_stream = client.transcribe(audio_stream).await.unwrap();

        while let Some(result) = transcript_stream.next().await {
            println!("deepgram: {:?}", result);
        }
    }

    // cargo test test_clova -p stt --  --ignored --nocapture
    #[ignore]
    #[tokio::test]
    #[serial]
    async fn test_clova() {
        let audio_stream = microphone_as_stream();

        let mut client = ClovaClient::builder()
            .api_key(std::env::var("CLOVA_API_KEY").unwrap())
            .keywords(vec!["Hyprnote".to_string()])
            .build()
            .await
            .unwrap();

        let mut transcript_stream = client.transcribe(audio_stream).await.unwrap();

        while let Some(result) = transcript_stream.next().await {
            println!("clova: {:?}", result);
        }
    }
}
