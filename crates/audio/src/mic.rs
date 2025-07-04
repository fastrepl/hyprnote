use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{Device, SampleFormat, SampleRate, StreamConfig};
use futures_util::Stream as FuturesStream;
use futures_util::StreamExt;
use std::pin::Pin;
use std::sync::mpsc as std_mpsc;
use std::sync::{Arc, Mutex};
use std::task::{Context, Poll};
use tokio::sync::mpsc;
use tokio::time::{timeout, Duration};

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

    /// Test if a device actually works by attempting to create a stream and receive audio samples
    pub async fn validate_device(device_name: Option<String>) -> Result<bool, crate::AudioError> {
        let test_input = if let Some(name) = device_name {
            Self::with_device(&name)
        } else {
            Self::default()
        };

        // Try to create a stream - if this fails, the device doesn't work
        let mut test_stream = test_input.stream()?;

        // Test that the stream actually produces audio samples within 500ms
        let timeout_duration = Duration::from_millis(500);

        match timeout(timeout_duration, test_stream.next()).await {
            Ok(Some(_sample)) => {
                // Stream produced a sample within the timeout, device is working
                Ok(true)
            }
            Ok(None) => {
                // Stream ended unexpectedly, device is not working
                Ok(false)
            }
            Err(_) => {
                // Timeout occurred, no samples received within 500ms
                Ok(false)
            }
        }
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
                        // Try word-boundary partial match for similar names (e.g., "MacBook Pro Microphone" contains "MacBook" as a word)
                        let name_lower = name.to_lowercase();
                        let device_name_lower = device_name.to_lowercase();

                        // Only match if the search term appears as a complete word in the device name
                        if name_lower
                            .split_whitespace()
                            .any(|word| word == device_name_lower)
                        {
                            found_device = Some(device);
                            break;
                        }
                    }
                }

                if let Some(device) = found_device {
                    tracing::info!(
                        device_name = device.name().unwrap_or_default(),
                        "Found audio device"
                    );
                    Self {
                        device: Some(device),
                    }
                } else {
                    // Device not found, fall back to default
                    tracing::warn!(
                        device_name = device_name,
                        available_devices = ?device_names,
                        "Device not found in available devices, using default device instead"
                    );
                    Self::default()
                }
            }
            Err(e) => {
                // Failed to enumerate devices, fall back to default
                tracing::error!(error = %e, "Failed to get input devices, using default");
                Self::default()
            }
        }
    }

    pub fn stream(&self) -> Result<MicStream, crate::AudioError> {
        MicStream::new(self.device.clone())
    }

    pub fn sample_rate(&self) -> u32 {
        16000 // Standard sample rate for speech
    }
}

pub struct MicStream {
    receiver: mpsc::UnboundedReceiver<f32>,
    shutdown_sender: std_mpsc::Sender<()>,
    thread_handle: Option<std::thread::JoinHandle<()>>,
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
        |err| tracing::error!(error = %err, "Audio stream error"),
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
        |err| tracing::error!(error = %err, "Audio stream error"),
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
        |err| tracing::error!(error = %err, "Audio stream error"),
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
            if let Err(e) = sender.send(sample) {
                tracing::error!("Failed to send audio sample: {}", e);
            }
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
            if let Err(e) = sender.send(sample) {
                tracing::error!("Failed to send audio sample: {}", e);
            }
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
            if let Err(e) = sender.send(sample) {
                tracing::error!("Failed to send audio sample: {}", e);
            }
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
    fn new(device: Option<Device>) -> Result<Self, crate::AudioError> {
        let (sender, receiver) = mpsc::unbounded_channel();
        let (shutdown_sender, shutdown_receiver) = std_mpsc::channel();

        // Do all the setup that can fail synchronously before spawning the thread
        let device = match device {
            Some(device) => device,
            None => {
                let host = cpal::default_host();
                host.default_input_device().ok_or_else(|| {
                    crate::AudioError::DeviceNotFound("No input device available".to_string())
                })?
            }
        };

        let config = device.default_input_config()?;

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
        )?;

        stream.play()?;

        // Spawn the stream in a dedicated thread to avoid Send issues
        let stream_handle = std::thread::spawn(move || {
            // Wait for shutdown signal instead of parking indefinitely
            let _ = shutdown_receiver.recv();
            // Stream is automatically dropped when thread ends
        });

        // We need to store the thread handle separately for proper cleanup
        // but we can't move it into the tokio task and also store it
        // Let's just store it and remove the tokio wrapper for now
        Ok(Self {
            receiver,
            shutdown_sender,
            thread_handle: Some(stream_handle),
        })
    }

    pub fn sample_rate(&self) -> u32 {
        16000
    }
}

impl Drop for MicStream {
    fn drop(&mut self) {
        // Send shutdown signal
        let _ = self.shutdown_sender.send(());

        // Wait for the thread to finish with a timeout to prevent blocking indefinitely
        if let Some(handle) = self.thread_handle.take() {
            // Use a separate thread for the join to avoid blocking for too long
            let (tx, rx) = std::sync::mpsc::channel();
            let _join_thread = std::thread::spawn(move || {
                let result = handle.join();
                let _ = tx.send(result);
            });

            // Give the thread 1 second to complete
            if rx.recv_timeout(Duration::from_secs(1)).is_err() {
                tracing::warn!("Audio thread did not shut down within timeout");
            }
        }
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
        let mut stream = mic.stream().expect("Failed to create mic stream");

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
