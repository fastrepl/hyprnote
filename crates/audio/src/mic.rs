use cpal::{
    traits::{DeviceTrait, HostTrait, StreamTrait},
    SizedSample,
};
use dasp::sample::ToSample;
use futures_channel::mpsc;
use futures_util::{Stream, StreamExt};
use std::pin::Pin;
use std::time::{Duration, Instant};

use crate::AsyncSource;

pub struct MicInput {
    #[allow(dead_code)]
    host: cpal::Host,
    device: cpal::Device,
    config: cpal::SupportedStreamConfig,
}

fn common_test_configs() -> Vec<cpal::SupportedStreamConfig> {
    vec![
        create_standard_config(48000, cpal::SampleFormat::F32),
        create_standard_config(44100, cpal::SampleFormat::F32),
        create_standard_config(48000, cpal::SampleFormat::I16),
    ]
}

fn try_validate_config(device: &cpal::Device, config: &cpal::SupportedStreamConfig) -> bool {
    try_build_test_stream(device, config)
}

fn try_configs_on_device(
    device: &cpal::Device,
    configs: Vec<cpal::SupportedStreamConfig>,
) -> Option<cpal::SupportedStreamConfig> {
    for config in configs.into_iter() {
        if try_validate_config(device, &config) {
            return Some(config);
        }
    }
    None
}

fn validate_against_common_configs(device: &cpal::Device) -> Option<cpal::SupportedStreamConfig> {
    try_configs_on_device(device, common_test_configs())
}

fn create_standard_config(
    sample_rate: u32,
    sample_format: cpal::SampleFormat,
) -> cpal::SupportedStreamConfig {
    cpal::SupportedStreamConfig::new(
        cpal::ChannelCount::from(2u16),
        cpal::SampleRate(sample_rate),
        cpal::SupportedBufferSize::Unknown,
        sample_format,
    )
}

fn validate_device_with_fallback(device: &cpal::Device) -> Option<cpal::SupportedStreamConfig> {
    // Try common configurations first
    if let Some(config) = validate_against_common_configs(device) {
        return Some(config);
    }

    // Fall back to standard F32 config
    Some(create_standard_config(48000, cpal::SampleFormat::F32))
}

fn try_build_test_stream(device: &cpal::Device, config: &cpal::SupportedStreamConfig) -> bool {
    let test_result = match config.sample_format() {
        cpal::SampleFormat::F32 => device.build_input_stream::<f32, _, _>(
            &config.config(),
            |_data: &[f32], _: &cpal::InputCallbackInfo| {},
            |_err| {},
            None,
        ),
        cpal::SampleFormat::I16 => device.build_input_stream::<i16, _, _>(
            &config.config(),
            |_data: &[i16], _: &cpal::InputCallbackInfo| {},
            |_err| {},
            None,
        ),
        cpal::SampleFormat::I8 => device.build_input_stream::<i8, _, _>(
            &config.config(),
            |_data: &[i8], _: &cpal::InputCallbackInfo| {},
            |_err| {},
            None,
        ),
        cpal::SampleFormat::I32 => device.build_input_stream::<i32, _, _>(
            &config.config(),
            |_data: &[i32], _: &cpal::InputCallbackInfo| {},
            |_err| {},
            None,
        ),
        _ => return false,
    };
    test_result.is_ok()
}

fn enumerate_input_devices(host: &cpal::Host) -> Vec<cpal::Device> {
    host.input_devices()
        .map(|d| d.collect())
        .unwrap_or_default()
}

fn is_echo_cancel_available_with_timeout() -> Result<bool, crate::Error> {
    use std::process::{Command, Stdio};

    let mut child = Command::new("pactl")
        .args(["list", "sources", "short"])
        .stdout(Stdio::piped())
        .spawn()
        .map_err(|_e| crate::Error::NoInputDevice)?;

    let start = Instant::now();
    let timeout = Duration::from_secs(5);

    loop {
        match child.try_wait() {
            Ok(Some(_status)) => {
                let output = child
                    .wait_with_output()
                    .map_err(|_e| crate::Error::NoInputDevice)?;
                let has = String::from_utf8_lossy(&output.stdout).contains("echo-cancel-source");
                return Ok(has);
            }
            Ok(None) => {
                if start.elapsed() >= timeout {
                    let _ = child.kill();
                    let _ = child.wait();
                    return Err(crate::Error::NoInputDevice);
                }
                std::thread::sleep(Duration::from_millis(50));
            }
            Err(_e) => return Err(crate::Error::NoInputDevice),
        }
    }
}

fn try_echo_cancel_fallback(
    _host: &cpal::Host,
    default_input_device: &Option<cpal::Device>,
) -> Option<(cpal::Device, cpal::SupportedStreamConfig)> {
    if is_echo_cancel_available_with_timeout().ok()? != true {
        return None;
    }

    if let Some(default_device) = default_input_device {
        if let Some(config) = validate_device_with_fallback(default_device) {
            return Some((default_device.clone(), config));
        }
    }

    // Try ALSA fallback if no default device or validation failed
    try_alsa_fallback().map(|(_, d, c)| (d, c))
}

fn try_alsa_fallback() -> Option<(cpal::Host, cpal::Device, cpal::SupportedStreamConfig)> {
    let alsa_host = cpal::host_from_id(cpal::HostId::Alsa).ok()?;
    let devices = alsa_host.input_devices().ok()?;
    for device in devices {
        if let Some(config) = validate_device_with_fallback(&device) {
            return Some((alsa_host, device, config));
        }
    }
    None
}

impl MicInput {
    pub fn device_name(&self) -> String {
        self.device
            .name()
            .unwrap_or("Unknown Microphone".to_string())
    }

    /// List available input audio device names.
    ///
    /// A Vec<String> containing the names of available input devices. If a device's
    /// name cannot be retrieved, the entry will be "Unknown Microphone".
    ///
    /// # Examples
    ///
    /// ```rust
    /// use audio::MicInput;
    /// let names = MicInput::list_devices();
    /// assert!(names.iter().all(|n| !n.is_empty()));
    /// ```
    pub fn list_devices() -> Vec<String> {
        cpal::default_host()
            .input_devices()
            .unwrap()
            .map(|d| d.name().unwrap_or("Unknown Microphone".to_string()))
            .collect()
    }

    /// Creates a new MicInput by selecting and configuring an available input device.
    ///
    /// This tries to select the requested device when `device_name` is Some, otherwise it prefers
    /// the system default input device and falls back to the first enumerated input device. If no
    /// devices are directly usable the initializer attempts platform-specific fallbacks (for example
    /// handling echo-cancel-source and ALSA probes) before returning an error.
    ///
    /// # Parameters
    ///
    /// - `device_name`: Optional device name to prefer; when `None` the function will use the default
    ///   input device if valid, otherwise the first available device.
    ///
    /// # Returns
    ///
    /// `Ok(Self)` with the chosen host, device, and supported stream configuration on success,
    /// `Err(crate::Error::NoInputDevice)` if no usable input device or configuration can be found.
    ///
    /// # Examples
    ///
    /// ```rust
    /// use audio::MicInput;
    /// let _ = MicInput::new(None);
    /// ```
    pub fn new(device_name: Option<String>) -> Result<Self, crate::Error> {
        let host = cpal::default_host();
        tracing::info!("Initializing microphone input...");

        let default_input_device = host.default_input_device();
        Self::log_audio_system_info(&host, &default_input_device);

        let input_devices = enumerate_input_devices(&host);

        // Handle echo-cancel-source and empty device list
        if let Some((device, config)) =
            Self::handle_special_cases(&device_name, &host, &default_input_device, &input_devices)?
        {
            return Ok(Self {
                host,
                device,
                config,
            });
        }

        // Select appropriate device
        let device = Self::select_device(device_name, &default_input_device, &input_devices)?;

        // Get configuration for selected device
        let config = Self::get_device_config(&device)?;

        Ok(Self {
            host,
            device,
            config,
        })
    }

    /// Log audio system information for debugging
    fn log_audio_system_info(host: &cpal::Host, default_input_device: &Option<cpal::Device>) {
        tracing::debug!(
            "Default input device: {:?}",
            default_input_device.as_ref().and_then(|d| d.name().ok())
        );
        tracing::debug!("Available hosts: {:?}", cpal::available_hosts());
        tracing::debug!("Default host: {:?}", host.id());
    }

    /// Handle special cases like echo-cancel-source and empty device lists
    fn handle_special_cases(
        device_name: &Option<String>,
        host: &cpal::Host,
        default_input_device: &Option<cpal::Device>,
        input_devices: &[cpal::Device],
    ) -> Result<Option<(cpal::Device, cpal::SupportedStreamConfig)>, crate::Error> {
        // Special handling for echo-cancel-source or when enumeration failed
        if device_name.as_ref().map(|n| n.as_str()) == Some("echo-cancel-source")
            || (device_name.is_none() && input_devices.is_empty())
        {
            if let Some((device, config)) = try_echo_cancel_fallback(host, default_input_device) {
                return Ok(Some((device, config)));
            }
        }

        // If we have no input devices, try to use the default device directly
        if input_devices.is_empty() {
            tracing::warn!("No input devices found through enumeration");

            if let Some(default_device) = default_input_device {
                tracing::debug!("Trying default device directly");
                match default_device.default_input_config() {
                    Ok(config) => {
                        tracing::debug!("Default device works directly");
                        return Ok(Some((default_device.clone(), config)));
                    }
                    Err(e) => {
                        tracing::error!(
                            "Default device failed even when accessed directly: {:?}",
                            e
                        );
                    }
                }
            }

            tracing::error!("No input devices available");
            return Err(crate::Error::NoInputDevice);
        }

        Ok(None)
    }

    /// Select appropriate audio device based on preferences
    fn select_device(
        device_name: Option<String>,
        default_input_device: &Option<cpal::Device>,
        input_devices: &[cpal::Device],
    ) -> Result<cpal::Device, crate::Error> {
        for (i, device) in input_devices.iter().enumerate() {
            match device.name() {
                Ok(name) => tracing::debug!("Input device {}: {}", i, name),
                Err(e) => tracing::debug!("Input device {}: Failed to get name: {:?}", i, e),
            }
        }

        let device = match device_name {
            None => Self::select_default_device(default_input_device, input_devices)?,
            Some(name) => Self::select_named_device(name, input_devices)?,
        };

        match device.name() {
            Ok(name) => tracing::debug!("Selected device: {}", name),
            Err(e) => tracing::warn!("Selected device with unknown name: {:?}", e),
        }

        Ok(device)
    }

    /// Select default or first available device
    fn select_default_device(
        default_input_device: &Option<cpal::Device>,
        input_devices: &[cpal::Device],
    ) -> Result<cpal::Device, crate::Error> {
        // Try default device first
        let default_device_works = if let Some(ref device) = default_input_device {
            if let Ok(name) = device.name() {
                tracing::debug!("Trying default input device: {}", name);
            }

            // Try to get config for default device
            match device.default_input_config() {
                Ok(_) => {
                    tracing::debug!("Default device is working");
                    true
                }
                Err(e) => {
                    tracing::warn!(
                        "Default device not working: {:?}, falling back to first available device",
                        e
                    );
                    false
                }
            }
        } else {
            tracing::warn!("No default input device found");
            false
        };

        if default_device_works {
            Ok(default_input_device.as_ref().unwrap().clone())
        } else {
            tracing::debug!("Using first available device");
            input_devices
                .first()
                .ok_or(crate::Error::NoInputDevice)
                .map(|d| d.clone())
        }
    }

    /// Select device by name, fallback to first available
    fn select_named_device(
        name: String,
        input_devices: &[cpal::Device],
    ) -> Result<cpal::Device, crate::Error> {
        tracing::debug!("Looking for device with name: {}", name);

        // Try to find device with exact name match first
        let device = input_devices
            .iter()
            .find(|d| d.name().unwrap_or_default() == name)
            .cloned();

        // If not found, try partial matching for ALSA device names
        let device = device.or_else(|| {
            input_devices
                .iter()
                .find(|d| {
                    if let Ok(cpal_name) = d.name() {
                        // Try partial match (e.g., "HD-Audio Generic" in both)
                        if cpal_name.contains("HD-Audio") && name.contains("HD-Audio") {
                            return true;
                        }
                    }
                    false
                })
                .cloned()
        });

        match device {
            Some(device) => {
                if let Ok(device_name) = device.name() {
                    tracing::debug!("Found requested device: {}", device_name);
                }
                Ok(device)
            }
            None => {
                tracing::warn!(
                    "Requested device '{}' not found, using first available device",
                    name
                );
                input_devices
                    .first()
                    .ok_or(crate::Error::NoInputDevice)
                    .map(|d| d.clone())
            }
        }
    }

    /// Get configuration for selected device
    fn get_device_config(
        device: &cpal::Device,
    ) -> Result<cpal::SupportedStreamConfig, crate::Error> {
        match device.default_input_config() {
            Ok(config) => {
                tracing::debug!("Successfully got default input config: {:?}", config);
                Ok(config)
            }
            Err(e) => {
                tracing::error!(
                    "Failed to get default input config for device {:?}: {:?}",
                    device.name().unwrap_or_default(),
                    e
                );
                Err(crate::Error::NoInputDevice)
            }
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
                        tracing::error!("Unsupported sample format '{sample_format}'");
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
        let mic = match MicInput::new(None) {
            Ok(mic) => mic,
            Err(_) => {
                // Skip test if no microphone is available
                return;
            }
        };
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
