use anyhow::Result;
use bytes::Bytes;
use futures::Stream;
use std::error::Error;

mod clova;
pub use clova::*;

mod deep;
pub use deep::*;

trait RealtimeSpeechToText<S, E> {
    async fn transcribe(&self, stream: S) -> Result<impl Stream<Item = Result<StreamResponse>>>
    where
        S: Stream<Item = Result<Bytes, E>> + Send + Unpin + 'static,
        E: Error + Send + Sync + 'static;
}

pub struct StreamResponse {
    pub text: String,
}

#[cfg(test)]
mod tests {
    use super::*;
    use serial_test::serial;

    use anyhow::Result;
    use bytes::{BufMut, Bytes, BytesMut};
    use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
    use cpal::Sample;
    use futures::SinkExt;
    use std::thread;

    fn microphone_as_stream() -> futures::channel::mpsc::Receiver<Result<Bytes, std::io::Error>> {
        let (sync_tx, sync_rx) = std::sync::mpsc::channel();
        let (mut async_tx, async_rx) = futures::channel::mpsc::channel(1);

        thread::spawn(move || {
            let host = cpal::default_host();
            let device = host.default_input_device().unwrap();
            let config = device.default_input_config().unwrap();

            let stream = match config.sample_format() {
                cpal::SampleFormat::F32 => device
                    .build_input_stream(
                        &config.into(),
                        move |data: &[f32], _: &_| {
                            let mut bytes = BytesMut::with_capacity(data.len() * 2);
                            for s in data {
                                let sample = s.to_sample::<i16>();
                                bytes.put_i16_le(sample);
                            }
                            sync_tx.send(bytes.freeze()).unwrap();
                        },
                        |_| panic!(),
                        None,
                    )
                    .unwrap(),
                _ => panic!(),
            };

            stream.play().unwrap();

            loop {
                thread::park();
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

    #[tokio::test]
    #[serial]
    async fn test_transcribe() {
        let config = DeepgramConfig {
            api_key: "".to_string(),
        };
        let client = DeepgramClient::new(config);
        let stream = microphone_as_stream();
        let _ = client.transcribe(stream).await.unwrap();
        assert!(true);
    }
}
