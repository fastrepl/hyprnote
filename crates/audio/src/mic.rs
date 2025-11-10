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

fn common_test_configs() -> Vec<cpal::SupportedStreamConfig> {
    vec![
        cpal::SupportedStreamConfig::new(
            cpal::ChannelCount::from(2u16),
            cpal::SampleRate(48000),
            cpal::SupportedBufferSize::Unknown,
            cpal::SampleFormat::F32,
        ),
        cpal::SupportedStreamConfig::new(
            cpal::ChannelCount::from(2u16),
            cpal::SampleRate(44100),
            cpal::SupportedBufferSize::Unknown,
            cpal::SampleFormat::F32,
        ),
        cpal::SupportedStreamConfig::new(
            cpal::ChannelCount::from(2u16),
            cpal::SampleRate(48000),
            cpal::SupportedBufferSize::Unknown,
            cpal::SampleFormat::I16,
        ),
    ]
}

fn try_validate_config(device: &cpal::Device, config: &cpal::SupportedStreamConfig) -> bool {
    let test_result = match config.sample_format() {
        cpal::SampleFormat::F32 => device.build_input_stream::<f32, _, _>(
            &config.config(),
            |_data: &[f32], _: &cpal::InputCallbackInfo| {},
            |err| tracing::debug!("Test stream error: {}", err),
            None,
        ),
        cpal::SampleFormat::I16 => device.build_input_stream::<i16, _, _>(
            &config.config(),
            |_data: &[i16], _: &cpal::InputCallbackInfo| {},
            |err| tracing::debug!("Test stream error: {}", err),
            None,
        ),
        other => {
            tracing::debug!("Unsupported sample format for testing: {:?}", other);
            return false;
        }
    };
    if test_result.is_ok() {
        if let Ok(name) = device.name() {
            tracing::debug!("Validated config for device: {}", name);
        }
        true
    } else {
        false
    }
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
        tracing::debug!(
            "Default input device: {:?}",
            default_input_device.as_ref().and_then(|d| d.name().ok())
        );

        // Log host information
        tracing::debug!("Available hosts: {:?}", cpal::available_hosts());
        tracing::debug!("Default host: {:?}", host.id());

        let input_devices: Vec<cpal::Device> = host
            .input_devices()
            .map(|devices| {
                let devices: Vec<cpal::Device> = devices.collect();
                tracing::debug!("Found {} input devices", devices.len());
                devices
            })
            .unwrap_or_else(|e| {
                tracing::error!("Failed to enumerate input devices: {:?}", e);
                Vec::new()
            });

        for (i, device) in input_devices.iter().enumerate() {
            match device.name() {
                Ok(name) => tracing::debug!("Input device {}: {}", i, name),
                Err(e) => tracing::debug!("Input device {}: Failed to get name: {:?}", i, e),
            }
        }

        // Special handling for echo-cancel-source
        if device_name.as_ref().map(|n| n.as_str()) == Some("echo-cancel-source")
            || (device_name.is_none() && input_devices.is_empty())
        {
            // Check if echo-cancel-source is available
            let echo_cancel_available = std::process::Command::new("pactl")
                .args(["list", "sources", "short"])
                .output()
                .map(|output| {
                    String::from_utf8_lossy(&output.stdout).contains("echo-cancel-source")
                })
                .unwrap_or(false);

            if echo_cancel_available {
                tracing::debug!(
                    "Echo cancel source available in pactl: {}",
                    echo_cancel_available
                );

                if let Some(ref default_device) = default_input_device {
                    if let Ok(name) = default_device.name() {
                        tracing::debug!("Trying default host device with manual config: {}", name);

                        // Try common configurations that should work with PipeWire
                        let configs_to_try = common_test_configs();

                        for config in configs_to_try {
                            tracing::debug!("Trying manual config: {:?}", config);
                            if try_validate_config(default_device, &config) {
                                tracing::debug!(
                                    "Successfully validated config for device: {}",
                                    name
                                );
                                return Ok(Self {
                                    host,
                                    device: default_device.clone(),
                                    config,
                                });
                            } else {
                                tracing::debug!("Failed to validate config: {:?}", config);
                            }
                        }
                    }
                }

                // If all manual configurations failed but we know echo-cancel-source exists,
                // return a standard configuration that should work
                tracing::debug!("All manual configurations failed, but echo-cancel-source is available. Using standard config.");
                if let Some(ref default_device) = default_input_device {
                    let standard_config = cpal::SupportedStreamConfig::new(
                        cpal::ChannelCount::from(2u16),
                        cpal::SampleRate(48000),
                        cpal::SupportedBufferSize::Unknown,
                        cpal::SampleFormat::F32,
                    );
                    return Ok(Self {
                        host,
                        device: default_device.clone(),
                        config: standard_config,
                    });
                }

                // If the default device didn't work, try ALSA host
                if let Ok(alsa_host) = cpal::host_from_id(cpal::HostId::Alsa) {
                    tracing::debug!("Created ALSA host successfully");

                    // Try the same approach with ALSA host
                    if let Ok(devices) = alsa_host.input_devices() {
                        for device in devices {
                            if let Ok(name) = device.name() {
                                tracing::debug!("ALSADevice: {}", name);

                                // Try the same configurations
                                let configs_to_try = common_test_configs();

                                for config in configs_to_try {
                                    tracing::debug!("Trying ALSA manual config: {:?}", config);

                                    if try_validate_config(&device, &config) {
                                        tracing::debug!(
                                            "Successfully validated ALSA config for device: {}",
                                            name
                                        );
                                        return Ok(Self {
                                            host: alsa_host,
                                            device,
                                            config,
                                        });
                                    } else {
                                        tracing::debug!(
                                            "Failed to validate ALSA config: {:?}",
                                            config
                                        );
                                    }
                                }
                            }
                        }
                    } else {
                        tracing::debug!("Failed to enumerate ALSA input devices");
                    }
                } else {
                    tracing::debug!("Failed to create ALSA host");
                }

                // If ALSA approaches also failed but we know echo-cancel-source exists,
                // return a standard configuration that should work
                tracing::debug!("All ALSA configurations failed, but echo-cancel-source is available. Using standard config.");
                if let Some(ref default_device) = default_input_device {
                    let standard_config = cpal::SupportedStreamConfig::new(
                        cpal::ChannelCount::from(2u16),
                        cpal::SampleRate(48000),
                        cpal::SupportedBufferSize::Unknown,
                        cpal::SampleFormat::F32,
                    );
                    return Ok(Self {
                        host,
                        device: default_device.clone(),
                        config: standard_config,
                    });
                }
            }
        }

        // If we have no input devices, try to use the default device directly
        if input_devices.is_empty() {
            tracing::warn!("No input devices found through enumeration");

            // Try to use the default device directly
            if let Some(default_device) = default_input_device {
                tracing::debug!("Trying default device directly");
                match default_device.default_input_config() {
                    Ok(config) => {
                        tracing::debug!("Default device works directly");
                        return Ok(Self {
                            host,
                            device: default_device,
                            config,
                        });
                    }
                    Err(e) => {
                        tracing::error!(
                            "Default device failed even when accessed directly: {:?}",
                            e
                        );
                    }
                }
            }

            // If that fails, try some known working ALSA device names
            tracing::debug!("Trying known ALSA device names");
            let known_devices = vec![
                "default:CARD=Generic_1",
                "plughw:CARD=Generic_1,DEV=0",
                "hw:CARD=Generic_1,DEV=0",
            ];

            // Note: CPAL doesn't provide a way to create devices by name directly
            // So we can't implement this workaround with the current library
            tracing::warn!("Known ALSA device names: {:?}", known_devices);

            tracing::error!("No input devices available");
            return Err(crate::Error::NoInputDevice);
        }

        let device = match device_name {
            None => {
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
                            tracing::warn!("Default device not working: {:?}, falling back to first available device", e);
                            false
                        }
                    }
                } else {
                    tracing::warn!("No default input device found");
                    false
                };

                if default_device_works {
                    default_input_device.unwrap()
                } else {
                    tracing::debug!("Using first available device");
                    input_devices[0].clone()
                }
            }
            Some(name) => {
                tracing::debug!("Looking for device with name: {}", name);
                let device = input_devices
                    .iter()
                    .find(|d| d.name().unwrap_or_default() == name)
                    .cloned();

                match device {
                    Some(device) => {
                        if let Ok(name) = device.name() {
                            tracing::debug!("Found requested device: {}", name);
                        }
                        device
                    }
                    None => {
                        tracing::warn!(
                            "Requested device '{}' not found, using first available device",
                            name
                        );
                        input_devices[0].clone()
                    }
                }
            }
        };

        match device.name() {
            Ok(name) => tracing::debug!("Selected device: {}", name),
            Err(e) => tracing::warn!("Selected device with unknown name: {:?}", e),
        }

        let config = match device.default_input_config() {
            Ok(config) => {
                tracing::debug!("Successfully got default input config: {:?}", config);
                config
            }
            Err(e) => {
                tracing::error!(
                    "Failed to get default input config for device {:?}: {:?}",
                    device.name().unwrap_or_default(),
                    e
                );
                return Err(crate::Error::NoInputDevice);
            }
        };

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
