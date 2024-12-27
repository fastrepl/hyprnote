use anyhow::Result;
use bytes::Bytes;
use futures::Stream;
use std::error::Error;

mod clova;
pub use clova::*;

mod deep;
pub use deep::*;

trait RealtimeSpeechToText<S, E> {
    async fn transcribe(&mut self, stream: S) -> Result<impl Stream<Item = Result<StreamResponse>>>
    where
        S: Stream<Item = Result<Bytes, E>> + Send + Unpin + 'static,
        E: Error + Send + Sync + 'static;
}

#[derive(Debug)]
pub struct StreamResponse {
    pub text: String,
}

pub struct Client {}

pub struct Config {}

#[cfg(test)]
mod tests {
    use super::*;
    use serial_test::serial;

    use anyhow::Result;
    use bytes::{BufMut, Bytes};
    use futures::StreamExt;
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

    // cargo test test_deepgram -p stt --  --ignored --nocapture
    #[ignore]
    #[tokio::test]
    #[serial]
    async fn test_deepgram() {
        let audio_stream = microphone_as_stream();

        let config = DeepgramConfig {
            api_key: "a37c100f6aac3703fe23e5e41c63008f746d456b".to_string(),
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
            secret_key: "2fbc878c49bf48dbad194a95051083cb".to_string(),
            config: clova::clova::ConfigRequest {
                transcription: clova::clova::Transcription {
                    language: clova::clova::Language::Korean,
                },
            },
        };

        let mut client = ClovaClient::new(config).await.unwrap();
        let mut transcript_stream = client.transcribe(audio_stream).await.unwrap();

        while let Some(result) = transcript_stream.next().await {
            println!("clova: {:?}", result.unwrap());
        }
    }
}
