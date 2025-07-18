use cpal::{
    traits::{DeviceTrait, HostTrait, StreamTrait},
    Device, SizedSample,
};
use dasp::sample::ToSample;
use futures_channel::mpsc;
use futures_util::{Stream, StreamExt};
use std::pin::Pin;
use std::sync::Arc;
use tokio::sync::{Mutex, RwLock};

use crate::AsyncSource;

/// Information about an audio input device
#[derive(Debug, Clone)]
pub struct AudioDeviceInfo {
    pub name: String,
    pub index: usize,
}

/// A microphone input with runtime device selection.
pub struct MicInput {
    host: cpal::Host,
    current_device: Arc<RwLock<Device>>,
    current_config: Arc<RwLock<cpal::SupportedStreamConfig>>,
    stream_manager: Arc<Mutex<StreamManager>>,
}

struct StreamManager {
    switch_tx: Option<std::sync::mpsc::Sender<DeviceSwitchCommand>>,
}

enum DeviceSwitchCommand {
    SwitchDevice(Device, cpal::SupportedStreamConfig),
}

#[derive(Debug, thiserror::Error)]
pub enum MicInputError {
    #[error("No input device available")]
    NoInputDevice,
    #[error("Failed to get device config: {0}")]
    ConfigError(#[from] cpal::DefaultStreamConfigError),
    #[error("Device error: {0}")]
    DeviceError(String),
    #[error("Stream error: {0}")]
    StreamError(#[from] cpal::BuildStreamError),
    #[error("Play stream error: {0}")]
    PlayStreamError(#[from] cpal::PlayStreamError),
}

impl MicInput {
    /// Create a new MicInput with the default input device
    pub fn new() -> Result<Self, MicInputError> {
        let host = cpal::default_host();
        let device = host
            .default_input_device()
            .ok_or(MicInputError::NoInputDevice)?;
        let config = device.default_input_config()?;

        Ok(Self {
            host,
            current_device: Arc::new(RwLock::new(device)),
            current_config: Arc::new(RwLock::new(config)),
            stream_manager: Arc::new(Mutex::new(StreamManager { switch_tx: None })),
        })
    }

    /// Create a MicInput with a specific device by index
    pub fn with_device(device_index: usize) -> Result<Self, MicInputError> {
        let host = cpal::default_host();
        let device = host
            .input_devices()
            .map_err(|e| MicInputError::DeviceError(e.to_string()))?
            .nth(device_index)
            .ok_or(MicInputError::DeviceError(
                "Device index out of range".to_string(),
            ))?;
        let config = device.default_input_config()?;

        Ok(Self {
            host,
            current_device: Arc::new(RwLock::new(device)),
            current_config: Arc::new(RwLock::new(config)),
            stream_manager: Arc::new(Mutex::new(StreamManager { switch_tx: None })),
        })
    }

    /// Get a list of available input devices
    pub fn list_input_devices(&self) -> Vec<AudioDeviceInfo> {
        match self.host.input_devices() {
            Ok(devices) => devices
                .enumerate()
                .filter_map(|(index, device)| {
                    device
                        .name()
                        .ok()
                        .map(|name| AudioDeviceInfo { name, index })
                })
                .collect(),
            Err(_) => Vec::new(),
        }
    }

    /// Get the currently selected device name
    pub async fn current_device_name(&self) -> Result<String, MicInputError> {
        let device_guard = self.current_device.read().await;
        device_guard
            .name()
            .map_err(|e| MicInputError::DeviceError(e.to_string()))
    }

    /// Switch to a different input device by index
    pub async fn switch_device(&self, device_index: usize) -> Result<(), MicInputError> {
        let devices: Vec<_> = self
            .host
            .input_devices()
            .map_err(|e| MicInputError::DeviceError(e.to_string()))?
            .collect();

        let device = devices
            .into_iter()
            .nth(device_index)
            .ok_or(MicInputError::DeviceError(
                "Device index out of range".to_string(),
            ))?;

        let config = device.default_input_config()?;

        // Update the current device and config
        {
            let mut device_guard = self.current_device.write().await;
            *device_guard = device.clone();
        }
        {
            let mut config_guard = self.current_config.write().await;
            *config_guard = config.clone();
        }

        // Send switch command if there's an active stream
        let manager = self.stream_manager.lock().await;
        if let Some(tx) = &manager.switch_tx {
            tx.send(DeviceSwitchCommand::SwitchDevice(device, config))
                .map_err(|_| {
                    MicInputError::DeviceError("Failed to send switch command".to_string())
                })?;
        }

        Ok(())
    }

    /// Creates a new stream of audio data from the microphone (synchronous).
    pub fn stream(&self) -> MicStream {
        // Use bounded channel to prevent unbounded memory growth
        let (tx, rx) = mpsc::channel::<Vec<f32>>(64);
        let (switch_tx, switch_rx) = std::sync::mpsc::channel::<DeviceSwitchCommand>();
        let (shutdown_tx, shutdown_rx) = std::sync::mpsc::channel::<()>();

        // Clone current device and config synchronously using try_read
        let (device, config) = {
            let device_guard = self
                .current_device
                .try_read()
                .expect("Failed to read device");
            let config_guard = self
                .current_config
                .try_read()
                .expect("Failed to read config");
            (device_guard.clone(), config_guard.clone())
        };
        let config_clone = config.clone();

        // Store the switch channel sender asynchronously
        let stream_manager = self.stream_manager.clone();
        tokio::spawn(async move {
            let mut manager = stream_manager.lock().await;
            manager.switch_tx = Some(switch_tx);
        });

        // Spawn the CPAL handler thread
        std::thread::spawn(move || {
            cpal_stream_thread(device, config, tx, switch_rx, shutdown_rx);
        });

        let receiver = rx.map(futures_util::stream::iter).flatten();
        MicStream {
            config: config_clone,
            receiver: Box::pin(receiver),
            shutdown_tx: Some(shutdown_tx),
        }
    }
}

fn cpal_stream_thread(
    initial_device: Device,
    initial_config: cpal::SupportedStreamConfig,
    audio_tx: mpsc::Sender<Vec<f32>>,
    switch_rx: std::sync::mpsc::Receiver<DeviceSwitchCommand>,
    shutdown_rx: std::sync::mpsc::Receiver<()>,
) {
    let mut current_stream: Option<Box<dyn StreamTrait>> = None;
    let mut current_device = initial_device;
    let mut current_config = initial_config;

    loop {
        // Start stream if we don't have one
        if current_stream.is_none() {
            match start_stream(&current_device, &current_config, audio_tx.clone()) {
                Ok(stream) => {
                    current_stream = Some(stream);
                    tracing::info!("Audio stream started: {:?}", current_device.name());
                }
                Err(e) => {
                    tracing::error!("Failed to start audio stream: {}", e);
                    std::thread::sleep(std::time::Duration::from_secs(1));
                    continue;
                }
            }
        }

        // Check for commands with timeout
        match switch_rx.recv_timeout(std::time::Duration::from_millis(10)) {
            Ok(DeviceSwitchCommand::SwitchDevice(new_device, new_config)) => {
                tracing::info!("Switching audio device to: {:?}", new_device.name());

                // Stop current stream
                current_stream = None;

                // Small delay to ensure clean switch
                std::thread::sleep(std::time::Duration::from_millis(50));

                // Update device and config
                current_device = new_device;
                current_config = new_config;
            }
            Err(std::sync::mpsc::RecvTimeoutError::Timeout) => {
                // Check if we should shutdown
                match shutdown_rx.try_recv() {
                    Ok(_) => break,
                    Err(std::sync::mpsc::TryRecvError::Empty) => continue,
                    Err(std::sync::mpsc::TryRecvError::Disconnected) => break,
                }
            }
            Err(std::sync::mpsc::RecvTimeoutError::Disconnected) => {
                // Channel closed
                break;
            }
        }
    }

    // Cleanup
    drop(current_stream);
    tracing::info!("Audio stream thread shutting down");
}

fn start_stream(
    device: &Device,
    config: &cpal::SupportedStreamConfig,
    tx: mpsc::Sender<Vec<f32>>,
) -> Result<Box<dyn StreamTrait>, MicInputError> {
    fn build_stream<S: ToSample<f32> + SizedSample>(
        device: &cpal::Device,
        config: &cpal::SupportedStreamConfig,
        mut tx: mpsc::Sender<Vec<f32>>,
    ) -> Result<cpal::Stream, cpal::BuildStreamError> {
        let channels = config.channels() as usize;
        device.build_input_stream::<S, _, _>(
            &config.config(),
            move |data: &[S], _: &_| {
                let samples: Vec<f32> = data
                    .iter()
                    .step_by(channels)
                    .map(|&x| x.to_sample())
                    .collect();

                // Try to send, but don't block or panic if receiver is gone
                match tx.try_send(samples) {
                    Ok(_) => {}
                    Err(e) => {
                        if e.is_full() {
                            tracing::warn!("Audio buffer full, dropping samples");
                        }
                        // If disconnected, the stream will be cleaned up
                    }
                }
            },
            |err| {
                tracing::error!("Audio stream error: {}", err);
            },
            None,
        )
    }

    let stream: Box<dyn StreamTrait> = match config.sample_format() {
        cpal::SampleFormat::I8 => Box::new(build_stream::<i8>(device, config, tx)?),
        cpal::SampleFormat::I16 => Box::new(build_stream::<i16>(device, config, tx)?),
        cpal::SampleFormat::I32 => Box::new(build_stream::<i32>(device, config, tx)?),
        cpal::SampleFormat::F32 => Box::new(build_stream::<f32>(device, config, tx)?),
        sample_format => {
            return Err(MicInputError::DeviceError(format!(
                "Unsupported sample format '{}'",
                sample_format
            )));
        }
    };

    stream.play()?;
    Ok(stream)
}

/// A stream of audio data from the microphone.
pub struct MicStream {
    config: cpal::SupportedStreamConfig,
    receiver: Pin<Box<dyn Stream<Item = f32> + Send + Sync>>,
    shutdown_tx: Option<std::sync::mpsc::Sender<()>>,
}

impl Drop for MicStream {
    fn drop(&mut self) {
        // Signal shutdown to the background thread
        if let Some(tx) = self.shutdown_tx.take() {
            let _ = tx.send(());
        }
    }
}

impl Stream for MicStream {
    type Item = f32;

    fn poll_next(
        mut self: std::pin::Pin<&mut Self>,
        cx: &mut std::task::Context<'_>,
    ) -> std::task::Poll<Option<Self::Item>> {
        self.receiver.as_mut().poll_next_unpin(cx)
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

// Add rodio compatibility methods if needed
impl MicStream {
    /// Read all samples currently in the buffer (for compatibility)
    pub fn read_all(&mut self) -> rodio::buffer::SamplesBuffer<f32> {
        let mut samples = Vec::new();
        let mut cx = std::task::Context::from_waker(futures_util::task::noop_waker_ref());

        // Drain all available samples
        while let std::task::Poll::Ready(Some(sample)) = self.receiver.poll_next_unpin(&mut cx) {
            samples.push(sample);
        }

        rodio::buffer::SamplesBuffer::new(
            self.config.channels(),
            self.config.sample_rate().0,
            samples,
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn assert_mic_stream_send_sync() {
        fn assert_sync<T: Sync>() {}
        assert_sync::<MicStream>();
        fn assert_send<T: Send>() {}
        assert_send::<MicStream>();
    }

    #[test]
    fn test_mic_input_creation() {
        // This test might fail on systems without audio devices
        match MicInput::new() {
            Ok(mic) => {
                let devices = mic.list_input_devices();
                assert!(!devices.is_empty(), "Should have at least one input device");
            }
            Err(MicInputError::NoInputDevice) => {
                // Expected on systems without mics
            }
            Err(e) => panic!("Unexpected error: {}", e),
        }
    }
}
