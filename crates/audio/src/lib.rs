mod errors;
mod mic;
mod norm;
mod speaker;

pub use errors::*;
pub use mic::*;
pub use norm::*;
pub use speaker::*;

pub use cpal;
use cpal::traits::{DeviceTrait, HostTrait};

use futures_util::Stream;
pub use kalosm_sound::AsyncSource;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum DeviceKind {
    Input,
    Output,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DeviceInfo {
    pub name: String,
    pub is_default: bool,
    pub kind: DeviceKind,
}

pub struct AudioOutput {}

impl AudioOutput {
    pub fn to_speaker(bytes: &'static [u8]) -> std::sync::mpsc::Sender<()> {
        use rodio::{Decoder, OutputStream, Sink};
        let (tx, rx) = std::sync::mpsc::channel();

        std::thread::spawn(move || {
            if let Ok((_, stream)) = OutputStream::try_default() {
                let file = std::io::Cursor::new(bytes);
                if let Ok(source) = Decoder::new(file) {
                    let sink = Sink::try_new(&stream).unwrap();
                    sink.append(source);

                    let _ = rx.recv_timeout(std::time::Duration::from_secs(3600));
                    sink.stop();
                }
            }
        });

        tx
    }

    pub fn silence() -> std::sync::mpsc::Sender<()> {
        use rodio::{source::Zero, OutputStream, Sink};
        let (tx, rx) = std::sync::mpsc::channel();

        std::thread::spawn(move || {
            if let Ok((_, stream)) = OutputStream::try_default() {
                let sink = Sink::try_new(&stream).unwrap();
                sink.append(Zero::<f32>::new(1, 16000));

                let _ = rx.recv();
                sink.stop();
            }
        });

        tx
    }
}

pub enum AudioSource {
    RealtimeMic,
    RealtimeSpeaker,
    Recorded,
}

pub struct AudioInput {
    source: AudioSource,
    mic: Option<MicInput>,
    speaker: Option<SpeakerInput>,
    speaker_device_name: Option<String>,
    data: Option<Vec<u8>>,
}

impl AudioInput {
    /// Get the default input (microphone) device name.
    pub fn get_default_mic_device_name() -> String {
        let host = cpal::default_host();
        if let Some(device) = host.default_input_device() {
            device.name().unwrap_or("Unknown Microphone".to_string())
        } else {
            "No Microphone Available".to_string()
        }
    }

    /// Get the default output (speaker) device name.
    pub fn get_default_speaker_device_name() -> String {
        let host = cpal::default_host();
        if let Some(device) = host.default_output_device() {
            device.name().unwrap_or("Unknown Speaker".to_string())
        } else {
            "No Speaker Available".to_string()
        }
    }

    /// Returns a list of available input (microphone) device names.
    ///
    /// Filters out the "hypr-audio-tap" device and appends the virtual "echo-cancel-source" if
    /// present. Future improvement: return structured metadata.
    pub fn list_mic_devices() -> Vec<String> {
        let host = cpal::default_host();

        let devices: Vec<cpal::Device> = host
            .input_devices()
            .map(|devices| {
                let device_vec: Vec<cpal::Device> = devices.collect();
                tracing::debug!(
                    "Found {} input devices in list_mic_devices",
                    device_vec.len()
                );
                device_vec
            })
            .map_err(|e| {
                tracing::error!(
                    "Failed to enumerate input devices in list_mic_devices: {:?}",
                    e
                );
                e
            })
            .unwrap_or_else(|_| Vec::new());

        let mut result: Vec<String> = devices
            .into_iter()
            .filter_map(|d| {
                let name = d.name();
                match &name {
                    Ok(n) => tracing::debug!("Processing device: {}", n),
                    Err(e) => tracing::debug!("Processing device with error: {:?}", e),
                }
                name.ok()
            })
            .filter(|d| {
                let filtered = d != "hypr-audio-tap";
                if !filtered {
                    tracing::debug!("Filtering out device: {}", d);
                }
                filtered
            })
            .collect();

        // Add virtual echo-cancel device if it exists
        if std::process::Command::new("pactl")
            .args(["list", "sources", "short"])
            .output()
            .map(|output| String::from_utf8_lossy(&output.stdout).contains("echo-cancel-source"))
            .unwrap_or(false)
        {
            if !result.contains(&"echo-cancel-source".to_string()) {
                tracing::debug!("Adding virtual echo-cancel-source device");
                result.push("echo-cancel-source".to_string());
            }
        }

        tracing::debug!("Returning {} devices from list_mic_devices", result.len());
        result
    }

    /// Structured microphone device list.
    pub fn list_mic_devices_info() -> Vec<DeviceInfo> {
        let default_name = Self::get_default_mic_device_name();
        Self::list_mic_devices()
            .into_iter()
            .map(|name| DeviceInfo {
                is_default: name == default_name,
                name,
                kind: DeviceKind::Input,
            })
            .collect()
    }

    /// Returns a list of available output (speaker) device names.
    ///
    /// Filters out virtual or tap devices similar to input listing (currently only filters the
    /// hypr-audio-tap if present). Future improvements: expose richer metadata.
    pub fn list_speaker_devices() -> Vec<String> {
        let host = cpal::default_host();
        let devices: Vec<cpal::Device> = host
            .output_devices()
            .map(|devices| devices.collect())
            .unwrap_or_else(|e| {
                tracing::error!(
                    "Failed to enumerate output devices in list_speaker_devices: {:?}",
                    e
                );
                Vec::new()
            });

        let result: Vec<String> = devices
            .into_iter()
            .filter_map(|d| {
                let name = d.name();
                match &name {
                    Ok(n) => tracing::debug!("Processing output device: {}", n),
                    Err(e) => tracing::debug!("Processing output device with error: {:?}", e),
                }
                name.ok()
            })
            .filter(|d| d != "hypr-audio-tap")
            .collect();

        tracing::debug!(
            "Returning {} devices from list_speaker_devices",
            result.len()
        );
        result
    }

    /// Structured speaker device list.
    pub fn list_speaker_devices_info() -> Vec<DeviceInfo> {
        let default_name = Self::get_default_speaker_device_name();
        Self::list_speaker_devices()
            .into_iter()
            .map(|name| DeviceInfo {
                is_default: name == default_name,
                name,
                kind: DeviceKind::Output,
            })
            .collect()
    }

    /// Creates an AudioInput configured to stream from a microphone.
    pub fn from_mic(device_name: Option<String>) -> Result<Self, crate::Error> {
        tracing::info!(
            "Creating AudioInput from microphone with device name: {:?}",
            device_name
        );
        let mic = MicInput::new(device_name)?;
        tracing::debug!("Successfully created MicInput");

        Ok(Self {
            source: AudioSource::RealtimeMic,
            mic: Some(mic),
            speaker: None,
            speaker_device_name: None,
            data: None,
        })
    }

    /// Create AudioInput from system speaker output (default device only).
    /// Returns error if specific device is requested since device selection not yet implemented.
    pub fn from_speaker(device_name: Option<String>) -> Result<Self, crate::Error> {
        tracing::debug!("Creating AudioInput from speaker: {:?}", device_name);
        if device_name.is_some() {
            return Err(crate::Error::Generic(
                "Speaker device selection not yet implemented - use None for default".into(),
            ));
        }
        let speaker = match SpeakerInput::new() {
            Ok(speaker) => {
                tracing::debug!("Successfully created SpeakerInput");
                Some(speaker)
            }
            Err(e) => {
                tracing::error!("Failed to create SpeakerInput: {}", e);
                None
            }
        };

        Ok(Self {
            source: AudioSource::RealtimeSpeaker,
            mic: None,
            speaker,
            speaker_device_name: None,
            data: None,
        })
    }

    pub fn from_recording(data: Vec<u8>) -> Self {
        Self {
            source: AudioSource::Recorded,
            mic: None,
            speaker: None,
            speaker_device_name: None,
            data: Some(data),
        }
    }

    pub fn device_name(&self) -> String {
        match &self.source {
            AudioSource::RealtimeMic => self.mic.as_ref().unwrap().device_name(),
            AudioSource::RealtimeSpeaker => self
                .speaker_device_name
                .clone()
                .unwrap_or_else(|| "System Speaker".to_string()),
            AudioSource::Recorded => "Recorded".to_string(),
        }
    }

    pub fn stream(&mut self) -> Result<AudioStream, crate::Error> {
        match &self.source {
            AudioSource::RealtimeMic => {
                let mic = self.mic.as_ref().ok_or(crate::Error::StreamInitFailed)?;
                Ok(AudioStream::RealtimeMic { mic: mic.stream() })
            }
            AudioSource::RealtimeSpeaker => {
                let speaker = self.speaker.take().ok_or(crate::Error::StreamInitFailed)?;
                let speaker_stream = speaker
                    .stream()
                    .map_err(|_| crate::Error::StreamInitFailed)?;
                Ok(AudioStream::RealtimeSpeaker {
                    speaker: speaker_stream,
                })
            }
            AudioSource::Recorded => {
                let data = self.data.as_ref().ok_or(crate::Error::StreamInitFailed)?;
                Ok(AudioStream::Recorded {
                    data: data.clone(),
                    position: 0,
                })
            }
        }
    }
}

pub enum AudioStream {
    RealtimeMic { mic: MicStream },
    RealtimeSpeaker { speaker: SpeakerStream },
    Recorded { data: Vec<u8>, position: usize },
}

impl Stream for AudioStream {
    type Item = f32;

    fn poll_next(
        mut self: std::pin::Pin<&mut Self>,
        cx: &mut std::task::Context<'_>,
    ) -> std::task::Poll<Option<Self::Item>> {
        use futures_util::StreamExt;
        use std::task::Poll;

        match &mut *self {
            AudioStream::RealtimeMic { mic } => mic.poll_next_unpin(cx),
            AudioStream::RealtimeSpeaker { speaker } => speaker.poll_next_unpin(cx),
            // assume pcm_s16le, without WAV header
            AudioStream::Recorded { data, position } => {
                if *position + 2 <= data.len() {
                    let bytes = [data[*position], data[*position + 1]];
                    let sample = i16::from_le_bytes(bytes) as f32 / 32768.0;
                    *position += 2;

                    std::thread::sleep(std::time::Duration::from_secs_f64(1.0 / 16000.0));
                    Poll::Ready(Some(sample))
                } else {
                    Poll::Ready(None)
                }
            }
        }
    }
}

impl kalosm_sound::AsyncSource for AudioStream {
    fn as_stream(&mut self) -> impl Stream<Item = f32> + '_ {
        self
    }

    fn sample_rate(&self) -> u32 {
        match self {
            AudioStream::RealtimeMic { mic } => mic.sample_rate(),
            AudioStream::RealtimeSpeaker { speaker } => speaker.sample_rate(),
            AudioStream::Recorded { .. } => 16000,
        }
    }
}
