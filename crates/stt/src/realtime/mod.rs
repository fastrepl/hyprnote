use bytes::Bytes;
use futures_util::{Future, Stream};
use std::error::Error;

mod clova;
mod deepgram;
mod whisper;

use crate::deepgram::DeepgramClient;
use hypr_listener_interface::ListenOutputChunk;

#[allow(dead_code)]
pub trait RealtimeSpeechToText<S, E> {
    fn transcribe(
        &mut self,
        stream: S,
    ) -> impl Future<
        Output = Result<
            Box<dyn Stream<Item = Result<ListenOutputChunk, crate::Error>> + Send + Unpin>,
            crate::Error,
        >,
    >
    where
        S: Stream<Item = Result<Bytes, E>> + Send + Unpin + 'static,
        E: Error + Send + Sync + 'static;
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
            deepgram_api_key: self.deepgram_api_key,
            clova_api_key: self.clova_api_key,
        }
    }
}

#[derive(Debug)]
pub enum MultiClient {
    Clova(hypr_clova::realtime::Client),
    Deepgram(DeepgramClient),
    Whisper(hypr_whisper::cloud::WhisperClient),
}

#[derive(Debug, Clone)]
pub struct Client {
    pub deepgram_api_key: Option<String>,
    pub clova_api_key: Option<String>,
}

impl Client {
    pub fn builder() -> ClientBuilder {
        ClientBuilder::default()
    }

    pub async fn for_language(&self, language: hypr_language::Language) -> MultiClient {
        match language.iso639() {
            hypr_language::ISO639::Ko => {
                let clova = hypr_clova::realtime::Client::builder()
                    .api_key(self.clova_api_key.as_ref().unwrap())
                    .keywords(vec!["하이퍼노트".to_string()])
                    .build()
                    .await
                    .unwrap();
                MultiClient::Clova(clova)
            }
            hypr_language::ISO639::De => {
                let whisper = hypr_whisper::cloud::WhisperClient::builder()
                    .api_base(std::env::var("WHISPER_API_BASE").unwrap())
                    .api_key(std::env::var("WHISPER_API_KEY").unwrap())
                    .language(language.try_into().unwrap())
                    .build();

                MultiClient::Whisper(whisper)
            }
            hypr_language::ISO639::En => {
                let deepgram = DeepgramClient::builder()
                    .api_key(self.deepgram_api_key.as_ref().unwrap())
                    .keywords(vec!["Hyprnote".to_string()])
                    .language(language)
                    .build()
                    .unwrap();

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
    ) -> Result<
        Box<dyn Stream<Item = Result<ListenOutputChunk, crate::Error>> + Send + Unpin>,
        crate::Error,
    > {
        match self {
            MultiClient::Clova(client) => Ok(Box::new(client.transcribe(stream).await?)),
            MultiClient::Deepgram(client) => Ok(Box::new(client.transcribe(stream).await?)),
            MultiClient::Whisper(client) => Ok(Box::new(client.transcribe(stream).await?)),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serial_test::serial;

    use anyhow::Result;
    use bytes::Bytes;
    use futures_util::StreamExt;
    use hypr_audio_utils::AudioFormatExt;
    use std::io::Read;

    #[allow(unused)]
    fn microphone_as_stream(
    ) -> impl Stream<Item = Result<Bytes, std::io::Error>> + Send + Unpin + 'static {
        let source = hypr_audio::MicInput::default();

        source
            .stream()
            .to_i16_le_chunks(16 * 1000, 128)
            .map(|chunk| Ok(chunk))
    }

    #[allow(unused)]
    fn system_audio_as_stream(
    ) -> impl Stream<Item = Result<Bytes, std::io::Error>> + Send + Unpin + 'static {
        let source = hypr_audio::SpeakerInput::new(None).unwrap();

        source
            .stream()
            .unwrap()
            .to_i16_le_chunks(16 * 1000, 128)
            .map(|chunk| Ok(chunk))
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

        let mut client = Client::builder()
            .deepgram_api_key(std::env::var("DEEPGRAM_API_KEY").unwrap())
            .build()
            .for_language(hypr_language::ISO639::En.into())
            .await;

        let mut transcript_stream = client.transcribe(audio_stream).await.unwrap();

        let mut acc: Vec<hypr_listener_interface::TranscriptChunk> = vec![];
        while let Some(result) = transcript_stream.next().await {
            let data = result.unwrap();
            println!("{:?}", data);

            for t in data.transcripts {
                acc.push(t);
            }
        }

        serde_json::to_writer(&mut out, &acc).unwrap();
    }

    // RUST_TEST_TIMEOUT=0 cargo test test_clova -p stt --  --ignored --nocapture
    #[ignore]
    #[tokio::test]
    #[serial]
    async fn test_clova() {
        let audio_stream = stream_from_bytes(hypr_data::korean_2::AUDIO);
        let mut out = std::fs::File::create(hypr_data::korean_2::TRANSCRIPTION_PATH).unwrap();

        let mut client = Client::builder()
            .clova_api_key(std::env::var("CLOVA_API_KEY").unwrap())
            .build()
            .for_language(hypr_language::ISO639::Ko.into())
            .await;

        let mut transcript_stream = client.transcribe(audio_stream).await.unwrap();

        let mut acc: Vec<hypr_listener_interface::TranscriptChunk> = vec![];
        while let Some(result) = transcript_stream.next().await {
            let data = result.unwrap();
            println!("{:?}", data);

            for t in data.transcripts {
                acc.push(t);
            }
        }

        serde_json::to_writer(&mut out, &acc).unwrap();
    }
}
