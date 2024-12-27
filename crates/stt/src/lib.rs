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
    use bytes::{BufMut, Bytes, BytesMut};
    use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
    use futures::{SinkExt, StreamExt};

    fn microphone_as_stream() -> futures::channel::mpsc::Receiver<Result<Bytes, std::io::Error>> {
        let (sync_tx, sync_rx) = std::sync::mpsc::channel();
        let (mut async_tx, async_rx) = futures::channel::mpsc::channel(1);

        std::thread::spawn(move || {
            fn build_stream<S: dasp::sample::ToSample<i16> + cpal::SizedSample>(
                device: &cpal::Device,
                config: &cpal::SupportedStreamConfig,
                tx: std::sync::mpsc::Sender<Bytes>,
            ) -> Result<cpal::Stream, cpal::BuildStreamError> {
                device.build_input_stream(
                    &config.config(),
                    move |data: &[S], _: &_| {
                        let mut bytes = BytesMut::with_capacity(data.len() * 2);
                        for s in data {
                            bytes.put_i16_le(s.to_sample());
                        }
                        tx.send(bytes.freeze()).unwrap();
                    },
                    |err| {
                        panic!("error: {:?}", err);
                    },
                    None,
                )
            }

            let host = cpal::default_host();
            let device = host.default_input_device().unwrap();
            let config = device.default_input_config().unwrap();

            let stream = match config.sample_format() {
                cpal::SampleFormat::F32 => build_stream::<f32>(&device, &config, sync_tx).unwrap(),
                cpal::SampleFormat::I16 => build_stream::<i16>(&device, &config, sync_tx).unwrap(),
                _ => panic!("unsupported sample format"),
            };

            stream.play().unwrap();

            loop {
                std::thread::park();
            }
        });

        tokio::spawn(async move {
            loop {
                let data = sync_rx.recv().unwrap();
                async_tx.send(Ok(data)).await.unwrap();
            }
        });

        async_rx
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
            secret_key: "2f6a831630f943f8b81104d09df8b4e8".to_string(),
            config: clova::clova::ConfigRequest {
                transcription: clova::clova::Transcription {
                    language: clova::clova::Language::Korean
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
