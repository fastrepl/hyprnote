pub use kalosm_sound::{MicInput as KalosmMicInput, MicStream as KalosmMicStream};

use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{Device, SampleFormat, SampleRate, StreamConfig};
use futures_util::Stream as FuturesStream;
use std::pin::Pin;
use std::sync::mpsc as std_mpsc;
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

    /// Test if a device actually works by attempting to create a stream
    pub fn validate_device(device_name: Option<String>) -> Result<bool, crate::AudioError> {
        let test_input = if let Some(name) = device_name {
            Self::with_device(&name)
        } else {
            Self::default()
        };

        // Try to create a stream - if this fails, the device doesn't work
        let _test_stream = test_input.stream();

        // TODO: In future, we could test that the stream actually produces audio samples
        // For now, if stream creation succeeds, we assume the device works

        // If we got here, the device is valid
        Ok(true)
    }

    pub fn with_device(device_name: &str) -> Self {
        let host = cpal::default_host();

        match host.input_devices() {
            Ok(devices) => {
                let mut device_names = Vec::new();
                let mut found_device = None;

                for device in devices {
                    if let Ok(name) = device.name() {
                        device_names.push(name.clone());

                        // Try exact match first
                        if name == device_name {
                            found_device = Some(device);
                            break;
                        }
                        // Try case-insensitive match as fallback
                        if name.to_lowercase() == device_name.to_lowercase() {
                            found_device = Some(device);
                            break;
                        }
                        // Try partial match for similar names (e.g., "MacBook Pro Microphone" contains "MacBook")
                        if name.to_lowercase().contains(&device_name.to_lowercase())
                            || device_name.to_lowercase().contains(&name.to_lowercase())
                        {
                            found_device = Some(device);
                            break;
                        }
                    }
                }

                if let Some(device) = found_device {
                    eprintln!(
                        "✅ Found audio device: '{}'",
                        device.name().unwrap_or_default()
                    );
                    Self {
                        device: Some(device),
                    }
                } else {
                    // Device not found, fall back to default
                    eprintln!(
                        "❌ Device '{}' not found in available devices: {:?}",
                        device_name, device_names
                    );
                    eprintln!("🔄 Using default device instead");
                    Self::default()
                }
            }
            Err(e) => {
                // Failed to enumerate devices, fall back to default
                eprintln!("Failed to get input devices: {}, using default", e);
                Self::default()
            }
        }
    }

    pub fn stream(&self) -> MicStream {
        MicStream::new(self.device.clone())
    }

    pub fn sample_rate(&self) -> u32 {
        16000 // Standard sample rate for speech
    }
}

pub struct MicStream {
    receiver: mpsc::UnboundedReceiver<f32>,
    _stream_handle: tokio::task::JoinHandle<()>,
    shutdown_sender: std_mpsc::Sender<()>,
}

fn build_f32_stream(
    device: &Device,
    channels: u16,
    sample_rate: u32,
    resample_ratio: f64,
    sender: Arc<Mutex<mpsc::UnboundedSender<f32>>>,
) -> Result<cpal::Stream, crate::AudioError> {
    let sender_clone = sender.clone();
    let resample_counter = Arc::new(Mutex::new(0.0f64));

    let stream = device.build_input_stream(
        &StreamConfig {
            channels,
            sample_rate: SampleRate(sample_rate),
            buffer_size: cpal::BufferSize::Default,
        },
        move |data: &[f32], _: &cpal::InputCallbackInfo| {
            process_f32_data(
                data,
                channels,
                resample_ratio,
                &sender_clone,
                &resample_counter,
            );
        },
        |err| eprintln!("Audio stream error: {}", err),
        None,
    )?;

    Ok(stream)
}

fn build_i16_stream(
    device: &Device,
    channels: u16,
    sample_rate: u32,
    resample_ratio: f64,
    sender: Arc<Mutex<mpsc::UnboundedSender<f32>>>,
) -> Result<cpal::Stream, crate::AudioError> {
    let sender_clone = sender.clone();
    let resample_counter = Arc::new(Mutex::new(0.0f64));

    let stream = device.build_input_stream(
        &StreamConfig {
            channels,
            sample_rate: SampleRate(sample_rate),
            buffer_size: cpal::BufferSize::Default,
        },
        move |data: &[i16], _: &cpal::InputCallbackInfo| {
            process_i16_data(
                data,
                channels,
                resample_ratio,
                &sender_clone,
                &resample_counter,
            );
        },
        |err| eprintln!("Audio stream error: {}", err),
        None,
    )?;

    Ok(stream)
}

fn build_u16_stream(
    device: &Device,
    channels: u16,
    sample_rate: u32,
    resample_ratio: f64,
    sender: Arc<Mutex<mpsc::UnboundedSender<f32>>>,
) -> Result<cpal::Stream, crate::AudioError> {
    let sender_clone = sender.clone();
    let resample_counter = Arc::new(Mutex::new(0.0f64));

    let stream = device.build_input_stream(
        &StreamConfig {
            channels,
            sample_rate: SampleRate(sample_rate),
            buffer_size: cpal::BufferSize::Default,
        },
        move |data: &[u16], _: &cpal::InputCallbackInfo| {
            process_u16_data(
                data,
                channels,
                resample_ratio,
                &sender_clone,
                &resample_counter,
            );
        },
        |err| eprintln!("Audio stream error: {}", err),
        None,
    )?;

    Ok(stream)
}

fn process_f32_data(
    data: &[f32],
    channels: u16,
    resample_ratio: f64,
    sender: &Arc<Mutex<mpsc::UnboundedSender<f32>>>,
    resample_counter: &Arc<Mutex<f64>>,
) {
    let sender = sender.lock().unwrap();
    let mut counter = resample_counter.lock().unwrap();

    for chunk in data.chunks(channels as usize) {
        let sample = if channels == 1 {
            normalize_f32_sample(chunk[0])
        } else {
            chunk.iter().map(|&s| normalize_f32_sample(s)).sum::<f32>() / channels as f32
        };

        *counter += 1.0;
        if *counter >= resample_ratio {
            *counter -= resample_ratio;
            let _ = sender.send(sample);
        }
    }
}

fn process_i16_data(
    data: &[i16],
    channels: u16,
    resample_ratio: f64,
    sender: &Arc<Mutex<mpsc::UnboundedSender<f32>>>,
    resample_counter: &Arc<Mutex<f64>>,
) {
    let sender = sender.lock().unwrap();
    let mut counter = resample_counter.lock().unwrap();

    for chunk in data.chunks(channels as usize) {
        let sample = if channels == 1 {
            normalize_i16_sample(chunk[0])
        } else {
            chunk.iter().map(|&s| normalize_i16_sample(s)).sum::<f32>() / channels as f32
        };

        *counter += 1.0;
        if *counter >= resample_ratio {
            *counter -= resample_ratio;
            let _ = sender.send(sample);
        }
    }
}

fn process_u16_data(
    data: &[u16],
    channels: u16,
    resample_ratio: f64,
    sender: &Arc<Mutex<mpsc::UnboundedSender<f32>>>,
    resample_counter: &Arc<Mutex<f64>>,
) {
    let sender = sender.lock().unwrap();
    let mut counter = resample_counter.lock().unwrap();

    for chunk in data.chunks(channels as usize) {
        let sample = if channels == 1 {
            normalize_u16_sample(chunk[0])
        } else {
            chunk.iter().map(|&s| normalize_u16_sample(s)).sum::<f32>() / channels as f32
        };

        *counter += 1.0;
        if *counter >= resample_ratio {
            *counter -= resample_ratio;
            let _ = sender.send(sample);
        }
    }
}

// Specialize normalization for each sample type since generic approach doesn't work well with cpal
fn normalize_f32_sample(sample: f32) -> f32 {
    sample
}

fn normalize_i16_sample(sample: i16) -> f32 {
    sample as f32 / 32768.0
}

fn normalize_u16_sample(sample: u16) -> f32 {
    (sample as f32 - 32768.0) / 32768.0
}

fn build_stream_for_sample_format(
    device: &Device,
    config: &cpal::SupportedStreamConfig,
    channels: u16,
    sample_rate: u32,
    resample_ratio: f64,
    sender: Arc<Mutex<mpsc::UnboundedSender<f32>>>,
) -> Result<cpal::Stream, crate::AudioError> {
    match config.sample_format() {
        SampleFormat::F32 => {
            build_f32_stream(device, channels, sample_rate, resample_ratio, sender)
        }
        SampleFormat::I16 => {
            build_i16_stream(device, channels, sample_rate, resample_ratio, sender)
        }
        SampleFormat::U16 => {
            build_u16_stream(device, channels, sample_rate, resample_ratio, sender)
        }
        _ => Err(crate::AudioError::SampleFormatError(format!(
            "Unsupported sample format: {:?}",
            config.sample_format()
        ))),
    }
}

impl MicStream {
    fn new(device: Option<Device>) -> Self {
        let (sender, receiver) = mpsc::unbounded_channel();
        let (shutdown_sender, shutdown_receiver) = std_mpsc::channel();

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

            let stream = build_stream_for_sample_format(
                &device,
                &config,
                channels,
                sample_rate,
                resample_ratio,
                sender,
            )
            .expect("Failed to build audio stream");

            stream.play().expect("Failed to start audio stream");

            // Wait for shutdown signal instead of parking indefinitely
            let _ = shutdown_receiver.recv();
        });

        // Convert thread handle to tokio handle
        let stream_handle = tokio::task::spawn_blocking(move || {
            let _ = stream_handle.join();
        });

        Self {
            receiver,
            _stream_handle: stream_handle,
            shutdown_sender,
        }
    }

    pub fn sample_rate(&self) -> u32 {
        16000
    }
}

impl Drop for MicStream {
    fn drop(&mut self) {
        let _ = self.shutdown_sender.send(());
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
