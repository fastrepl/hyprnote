// Modified from https://github.com/floneum/floneum/blob/50afe10/interfaces/kalosm-sound/src/source/mic.rs

use std::pin::Pin;

use futures_channel::mpsc;
use futures_util::StreamExt;

use cpal::{
    traits::{DeviceTrait, HostTrait, StreamTrait},
    SizedSample,
};
use dasp::sample::ToSample;

pub struct MicInput {
    #[allow(dead_code)]
    host: cpal::Host,
    device: cpal::Device,
    config: cpal::SupportedStreamConfig,
}

pub struct MicStream {
    drop_tx: std::sync::mpsc::Sender<()>,
    config: cpal::SupportedStreamConfig,
    receiver: Pin<Box<dyn futures_core::Stream<Item = f32> + Send + Sync>>,
}

impl Default for MicInput {
    fn default() -> Self {
        let host = cpal::default_host();
        let device = host.default_input_device().unwrap();
        let config = device.default_input_config().unwrap();

        tracing::info!(
            name = ?device.name().unwrap().to_string(),
            sample_rate = ?config.sample_rate().0,
            "input_device"
        );

        Self {
            host,
            device,
            config,
        }
    }
}

impl MicInput {
    pub fn stream(&self) -> MicStream {
        let (tx, rx) = mpsc::unbounded::<Vec<f32>>();

        let config = self.config.clone();
        let device = self.device.clone();
        let (drop_tx, drop_rx) = std::sync::mpsc::channel();

        std::thread::spawn(move || {
            fn build_stream<S: ToSample<f32> + SizedSample>(
                device: &cpal::Device,
                config: &cpal::SupportedStreamConfig,
                mut tx: mpsc::UnboundedSender<Vec<f32>>,
            ) -> Result<cpal::Stream, cpal::BuildStreamError> {
                let channels = config.channels() as usize;
                device.build_input_stream::<S, _, _>(
                    &config.config(),
                    move |data: &[S], _: &_| {
                        let _ = tx.start_send(
                            data.iter()
                                .step_by(channels)
                                .map(|&x| x.to_sample())
                                .collect(),
                        );
                    },
                    |err| eprintln!("an error occurred on stream: {}", err),
                    None,
                )
            }

            let start_stream = || {
                let stream = match config.sample_format() {
                    cpal::SampleFormat::I8 => build_stream::<i8>(&device, &config, tx),
                    cpal::SampleFormat::I16 => build_stream::<i16>(&device, &config, tx),
                    cpal::SampleFormat::I32 => build_stream::<i32>(&device, &config, tx),
                    cpal::SampleFormat::F32 => build_stream::<f32>(&device, &config, tx),
                    sample_format => {
                        eprintln!("Unsupported sample format '{sample_format}'");
                        return None;
                    }
                };

                let stream = match stream {
                    Ok(stream) => stream,
                    Err(err) => {
                        eprintln!("Error starting stream: {}", err);
                        return None;
                    }
                };

                if let Err(err) = stream.play() {
                    eprintln!("Error playing stream: {}", err);
                }

                Some(stream)
            };

            let stream = match start_stream() {
                Some(stream) => stream,
                None => {
                    return;
                }
            };

            drop_rx.recv().unwrap();
            drop(stream);
        });

        let receiver = rx.map(futures_util::stream::iter).flatten();

        MicStream {
            drop_tx,
            config: self.config.clone(),
            receiver: Box::pin(receiver),
        }
    }
}

impl Drop for MicStream {
    fn drop(&mut self) {
        self.drop_tx.send(()).unwrap();
    }
}

impl futures_core::Stream for MicStream {
    type Item = f32;

    fn poll_next(
        mut self: std::pin::Pin<&mut Self>,
        cx: &mut std::task::Context<'_>,
    ) -> std::task::Poll<Option<Self::Item>> {
        match self.receiver.as_mut().poll_next_unpin(cx) {
            std::task::Poll::Ready(Some(chunk)) => std::task::Poll::Ready(Some(chunk)),
            std::task::Poll::Ready(None) => std::task::Poll::Ready(None),
            std::task::Poll::Pending => std::task::Poll::Pending,
        }
    }
}

impl crate::AsyncSource for MicStream {
    fn as_stream(&mut self) -> impl futures_core::Stream<Item = f32> + '_ {
        self
    }

    fn sample_rate(&self) -> u32 {
        self.config.sample_rate().0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_mic() {
        let mic = MicInput::default();
        let mut stream = mic.stream();

        let mut buffer = Vec::new();
        while let Some(sample) = stream.next().await {
            buffer.push(sample);
            if buffer.len() > 6000 {
                break;
            }
        }

        assert!(buffer.iter().any(|x| *x != 0.0));
    }
}
