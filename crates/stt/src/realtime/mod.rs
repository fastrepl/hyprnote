use anyhow::Result;
use bytes::Bytes;
use futures_core::{Future, Stream};
use serde::{Deserialize, Serialize};
use std::error::Error;

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

#[derive(Default, Clone, Debug, Deserialize, Serialize, specta::Type)]
pub struct StreamResponse {
    pub words: Vec<StreamResponseWord>,
}

#[derive(Default, Clone, Debug, Deserialize, Serialize, specta::Type)]
pub struct StreamResponseWord {
    pub text: String,
    pub start: u64,
    pub end: u64,
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
    use std::io::Read;

    fn microphone_as_stream(
    ) -> impl Stream<Item = Result<Bytes, std::io::Error>> + Send + Unpin + 'static {
        let source = hypr_audio::MicInput::default();
        let stream = source.stream().resample(16 * 1000).chunks(128);

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

    fn stream_from_bytes(
        bytes: &[u8],
    ) -> impl Stream<Item = Result<Bytes, std::io::Error>> + Send + Unpin + 'static {
        const SAMPLE_RATE: usize = 16000;
        const NUM_SAMPLES: usize = SAMPLE_RATE / 10;
        const CHUNK_SIZE_BYTES: usize = NUM_SAMPLES * (16 / 8);
        const DELAY_MS: usize = (1000 * NUM_SAMPLES) / SAMPLE_RATE;

        let bytes = bytes.to_vec();

        let stream = async_stream::stream! {
            let mut buffer = vec![0u8; CHUNK_SIZE_BYTES];
            let mut cursor = std::io::Cursor::new(bytes);

            loop {
                match cursor.read(&mut buffer) {
                    Ok(n) if n == 0 => break,
                    Ok(n) => {
                        let chunk = bytes::Bytes::copy_from_slice(&buffer[..n]);
                        tokio::time::sleep(tokio::time::Duration::from_millis(DELAY_MS as u64)).await;
                        yield Ok(chunk);
                    }
                    Err(e) => yield Err(e),
                }
            }
        };

        Box::pin(stream)
    }

    // RUST_TEST_TIMEOUT=0 cargo test test_deepgram -p stt --  --ignored --nocapture
    #[ignore]
    #[tokio::test]
    #[serial]
    async fn test_deepgram() {
        let audio_stream = stream_from_bytes(hypr_data::english_2::AUDIO);
        let mut out = std::fs::File::create(hypr_data::english_2::TRANSCRIPTION_PATH).unwrap();

        let mut client = DeepgramClient::builder()
            .api_key(std::env::var("DEEPGRAM_API_KEY").unwrap())
            .language(codes_iso_639::part_1::LanguageCode::En)
            .build();
        let mut transcript_stream = client.transcribe(audio_stream).await.unwrap();

        let mut acc: Vec<hypr_db::user::TranscriptChunk> = vec![];
        while let Some(result) = transcript_stream.next().await {
            let data = result.unwrap();
            println!("{:?}", data);

            for word in data.words {
                acc.push(hypr_db::user::TranscriptChunk {
                    text: word.text,
                    start: word.start,
                    end: word.end,
                });
            }
        }

        serde_json::to_writer(&mut out, &acc).unwrap();
    }

    // RUST_TEST_TIMEOUT=0 cargo test test_clova -p stt --  --ignored --nocapture
    #[ignore]
    #[tokio::test]
    #[serial]
    async fn test_clova() {
        let audio_stream = stream_from_bytes(hypr_data::korean_1::AUDIO);
        let mut out = std::fs::File::create(hypr_data::korean_1::TRANSCRIPTION_PATH).unwrap();

        let mut client = hypr_clova::realtime::Client::builder()
            .api_key(std::env::var("CLOVA_API_KEY").unwrap())
            .keywords(vec!["Hyprnote".to_string()])
            .build()
            .await
            .unwrap();

        let mut transcript_stream = client.transcribe(audio_stream).await.unwrap();

        let mut acc: Vec<hypr_db::user::TranscriptChunk> = vec![];
        while let Some(result) = transcript_stream.next().await {
            let data = result.unwrap();
            println!("{:?}", data);

            for word in data.words {
                acc.push(hypr_db::user::TranscriptChunk {
                    text: word.text,
                    start: word.start,
                    end: word.end,
                });
            }
        }

        serde_json::to_writer(&mut out, &acc).unwrap();
    }
}
