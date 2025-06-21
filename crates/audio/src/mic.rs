pub use kalosm_sound::{MicInput as KalosmMicInput, MicStream as KalosmMicStream};

use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{Device, SampleFormat, SampleRate, StreamConfig};
use futures_util::Stream as FuturesStream;
use std::pin::Pin;
use std::sync::{Arc, Mutex};
use std::task::{Context, Poll};
use tokio::sync::mpsc;

pub struct MicInput {
    device: Option<Device>,
}

impl Default for MicInput {
    fn default() -> Self {
        Self { device: None }
    }
}

impl MicInput {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn with_device(device_name: &str) -> Result<Self, crate::AudioError> {
        let host = cpal::default_host();
        let devices: Vec<_> = host.input_devices()?.collect();
        
        let device = devices
            .into_iter()
            .find(|d| d.name().map(|n| n == device_name).unwrap_or(false))
            .ok_or_else(|| crate::AudioError::DeviceNotFound(device_name.to_string()))?;

        Ok(Self {
            device: Some(device),
        })
    }

    pub fn stream(&self) -> MicStream {
        MicStream::new(self.device.clone()).unwrap_or_else(|_| {
            // Fallback to default if custom device fails
            MicStream::new(None).expect("Failed to create default mic stream")
        })
    }

    pub fn sample_rate(&self) -> u32 {
        16000 // Standard sample rate for speech
    }
}

pub struct MicStream {
    receiver: mpsc::UnboundedReceiver<f32>,
    _stream_handle: tokio::task::JoinHandle<()>,
}

impl MicStream {
    fn new(device: Option<Device>) -> Result<Self, crate::AudioError> {
        let (sender, receiver) = mpsc::unbounded_channel();
        
        // Spawn the stream in a dedicated thread to avoid Send issues
        let stream_handle = std::thread::spawn(move || {
            
            let device = match device {
                Some(device) => device,
                None => {
                    let host = cpal::default_host();
                    host.default_input_device()
                        .expect("No input device available")
                }
            };

            let config = device
                .default_input_config()
                .expect("Failed to get default input config");

            let sample_rate = config.sample_rate().0;
            let channels = config.channels();
            
            // Convert to our target format (mono 16kHz f32)
            let target_sample_rate = 16000u32;
            let resample_ratio = sample_rate as f64 / target_sample_rate as f64;

            let sender = Arc::new(Mutex::new(sender));

            let stream = match config.sample_format() {
                SampleFormat::F32 => {
                    let sender = sender.clone();
                    let resample_counter = Arc::new(Mutex::new(0.0f64));
                    device.build_input_stream(
                        &StreamConfig {
                            channels,
                            sample_rate: SampleRate(sample_rate),
                            buffer_size: cpal::BufferSize::Default,
                        },
                        move |data: &[f32], _: &cpal::InputCallbackInfo| {
                            let sender = sender.lock().unwrap();
                            let mut counter = resample_counter.lock().unwrap();
                            
                            // Convert stereo to mono if needed and resample
                            for chunk in data.chunks(channels as usize) {
                                let sample = if channels == 1 {
                                    chunk[0]
                                } else {
                                    // Convert to mono by averaging channels
                                    chunk.iter().sum::<f32>() / channels as f32
                                };

                                *counter += 1.0;
                                if *counter >= resample_ratio {
                                    *counter -= resample_ratio;
                                    let _ = sender.send(sample);
                                }
                            }
                        },
                        |err| eprintln!("Audio stream error: {}", err),
                        None,
                    )
                },
                SampleFormat::I16 => {
                    let sender = sender.clone();
                    let resample_counter = Arc::new(Mutex::new(0.0f64));
                    device.build_input_stream(
                        &StreamConfig {
                            channels,
                            sample_rate: SampleRate(sample_rate),
                            buffer_size: cpal::BufferSize::Default,
                        },
                        move |data: &[i16], _: &cpal::InputCallbackInfo| {
                            let sender = sender.lock().unwrap();
                            let mut counter = resample_counter.lock().unwrap();
                            
                            for chunk in data.chunks(channels as usize) {
                                let sample = if channels == 1 {
                                    chunk[0] as f32 / 32768.0
                                } else {
                                    // Convert to mono and normalize
                                    chunk.iter().map(|&s| s as f32).sum::<f32>() / (channels as f32 * 32768.0)
                                };

                                *counter += 1.0;
                                if *counter >= resample_ratio {
                                    *counter -= resample_ratio;
                                    let _ = sender.send(sample);
                                }
                            }
                        },
                        |err| eprintln!("Audio stream error: {}", err),
                        None,
                    )
                },
                SampleFormat::U16 => {
                    let sender = sender.clone();
                    let resample_counter = Arc::new(Mutex::new(0.0f64));
                    device.build_input_stream(
                        &StreamConfig {
                            channels,
                            sample_rate: SampleRate(sample_rate),
                            buffer_size: cpal::BufferSize::Default,
                        },
                        move |data: &[u16], _: &cpal::InputCallbackInfo| {
                            let sender = sender.lock().unwrap();
                            let mut counter = resample_counter.lock().unwrap();
                            
                            for chunk in data.chunks(channels as usize) {
                                let sample = if channels == 1 {
                                    (chunk[0] as f32 - 32768.0) / 32768.0
                                } else {
                                    // Convert to mono and normalize
                                    (chunk.iter().map(|&s| s as f32).sum::<f32>() / channels as f32 - 32768.0) / 32768.0
                                };

                                *counter += 1.0;
                                if *counter >= resample_ratio {
                                    *counter -= resample_ratio;
                                    let _ = sender.send(sample);
                                }
                            }
                        },
                        |err| eprintln!("Audio stream error: {}", err),
                        None,
                    )
                },
                _ => {
                    panic!("Unsupported sample format: {:?}", config.sample_format());
                },
            }.expect("Failed to build input stream");

            stream.play().expect("Failed to start audio stream");

            // Keep the stream alive
            std::thread::park();
        });
        
        // Convert thread handle to tokio handle
        let stream_handle = tokio::task::spawn_blocking(move || {
            let _ = stream_handle.join();
        });

        Ok(Self {
            receiver,
            _stream_handle: stream_handle,
        })
    }

    pub fn sample_rate(&self) -> u32 {
        16000
    }
}

impl FuturesStream for MicStream {
    type Item = f32;

    fn poll_next(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        match self.receiver.poll_recv(cx) {
            Poll::Ready(Some(sample)) => Poll::Ready(Some(sample)),
            Poll::Ready(None) => Poll::Ready(None),
            Poll::Pending => Poll::Pending,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use futures_util::StreamExt;

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
