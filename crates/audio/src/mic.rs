use cpal::{
    traits::{DeviceTrait, HostTrait, StreamTrait},
    SizedSample,
};
use dasp::sample::ToSample;
use futures_channel::mpsc;
use futures_util::{Stream, StreamExt};
use std::pin::Pin;

use crate::AsyncSource;

pub struct MicInput {
    #[allow(dead_code)]
    host: cpal::Host,
    device: cpal::Device,
    config: cpal::SupportedStreamConfig,
}

impl MicInput {
    pub fn device_name(&self) -> String {
        self.device
            .name()
            .unwrap_or("Unknown Microphone".to_string())
    }

    pub fn list_devices() -> Vec<String> {
        cpal::default_host()
            .input_devices()
            .unwrap()
            .map(|d| d.name().unwrap_or("Unknown Microphone".to_string()))
            .collect()
    }

    pub fn new(device_name: Option<String>) -> Result<Self, crate::Error> {
        let host = cpal::default_host();

        let default_input_device = host.default_input_device();
        let input_devices: Vec<cpal::Device> = host
            .input_devices()
            .map(|devices| devices.collect())
            .unwrap_or_else(|_| Vec::new());

        let device = match device_name {
            None => default_input_device
                .or_else(|| input_devices.into_iter().next())
                .ok_or(crate::Error::NoInputDevice)?,
            Some(name) => input_devices
                .into_iter()
                .find(|d| d.name().unwrap_or_default() == name)
                .or(default_input_device)
                .or_else(|| {
                    host.input_devices()
                        .ok()
                        .and_then(|mut devices| devices.next())
                })
                .ok_or(crate::Error::NoInputDevice)?,
        };

        let config = device.default_input_config().unwrap();
        tracing::info!(sample_rate = ?config.sample_rate());

        Ok(Self {
            host,
            device,
            config,
        })
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
                    move |data: &[S], _input_callback_info: &_| {
                        let _ = tx.start_send(
                            data.iter()
                                .step_by(channels)
                                .map(|&x| x.to_sample())
                                .collect(),
                        );
                    },
                    |err| {
                        tracing::error!("an error occurred on stream: {}", err);
                    },
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
                        tracing::error!(sample_format = ?sample_format, "unsupported");
                        return None;
                    }
                };

                let stream = match stream {
                    Ok(stream) => stream,
                    Err(err) => {
                        tracing::error!("Error starting stream: {}", err);
                        return None;
                    }
                };

                if let Err(err) = stream.play() {
                    tracing::error!("Error playing stream: {}", err);
                }

                Some(stream)
            };

            let stream = match start_stream() {
                Some(stream) => stream,
                None => {
                    return;
                }
            };

            // Wait for the stream to be dropped
            drop_rx.recv().unwrap();

            // Then drop the stream
            drop(stream);
        });

        let receiver = rx.map(futures_util::stream::iter).flatten();
        MicStream {
            drop_tx,
            config: self.config.clone(),
            receiver: Box::pin(receiver),
            read_data: Vec::new(),
        }
    }
}

pub struct MicStream {
    drop_tx: std::sync::mpsc::Sender<()>,
    config: cpal::SupportedStreamConfig,
    read_data: Vec<f32>,
    receiver: Pin<Box<dyn Stream<Item = f32> + Send + Sync>>,
}

impl Drop for MicStream {
    fn drop(&mut self) {
        self.drop_tx.send(()).unwrap();
    }
}

impl Stream for MicStream {
    type Item = f32;

    fn poll_next(
        mut self: std::pin::Pin<&mut Self>,
        cx: &mut std::task::Context<'_>,
    ) -> std::task::Poll<Option<Self::Item>> {
        match self.receiver.as_mut().poll_next_unpin(cx) {
            std::task::Poll::Ready(Some(data_chunk)) => {
                self.read_data.push(data_chunk);
                std::task::Poll::Ready(Some(data_chunk))
            }
            std::task::Poll::Ready(None) => std::task::Poll::Ready(None),
            std::task::Poll::Pending => std::task::Poll::Pending,
        }
    }
}

impl AsyncSource for MicStream {
    fn as_stream(&mut self) -> impl Stream<Item = f32> + '_ {
        self
    }

    fn sample_rate(&self) -> u32 {
        self.config.sample_rate().0
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use futures_util::StreamExt;

    #[tokio::test]
    async fn test_mic() {
        let mic = MicInput::new(None).unwrap();
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
