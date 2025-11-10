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
    data: Option<Vec<u8>>,
}

impl AudioInput {
    /// Get the default input device name
    pub fn get_default_mic_device_name() -> String {
        let host = cpal::default_host();
        if let Some(device) = host.default_input_device() {
            device.name().unwrap_or("Unknown Microphone".to_string())
        } else {
            "No Microphone Available".to_string()
        }
    }

    /// Returns a list of available input (microphone) device names.
    ///
    /// The returned list contains the names of enumerated input devices. It filters out the
    /// "hypr-audio-tap" device and will append the virtual "echo-cancel-source" device if
    /// `pactl list sources short` reports it and it is not already present.
    ///
    /// # Examples
    ///
    /// ```
    /// let devices = crate::audio::list_mic_devices();
    /// // devices is a Vec<String> of device names (may be empty)
    /// assert!(devices.is_empty() || devices.iter().all(|s| !s.is_empty()));
    /// ```
    pub fn list_mic_devices() -> Vec<String> {
        let host = cpal::default_host();

        let devices: Vec<cpal::Device> = host
            .input_devices()
            .map(|devices| {
                let device_vec: Vec<cpal::Device> = devices.collect();
                tracing::debug!("Found {} input devices in list_mic_devices", device_vec.len());
                device_vec
            })
            .map_err(|e| {
                tracing::error!("Failed to enumerate input devices in list_mic_devices: {:?}", e);
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
            .map(|output| {
                String::from_utf8_lossy(&output.stdout)
                    .contains("echo-cancel-source")
            })
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

    /// Creates an AudioInput configured to stream from a microphone.
    ///
    /// If `device_name` is `Some(name)`, attempts to open the input device with that name; if `None`, uses the default input device. On success returns an `AudioInput` with `source` set to `RealtimeMic` and `mic` initialized.
    ///
    /// # Errors
    ///
    /// Returns a `crate::Error` if microphone initialization fails.
    ///
    /// # Examples
    ///
    /// ```
    /// let ai = AudioInput::from_mic(None).expect("failed to open default microphone");
    /// assert!(matches!(ai.source, AudioSource::RealtimeMic));
    /// ```
    pub fn from_mic(device_name: Option<String>) -> Result<Self, crate::Error> {
        tracing::info!("Creating AudioInput from microphone with device name: {:?}", device_name);
        let mic = MicInput::new(device_name)?;
        tracing::debug!("Successfully created MicInput");

        Ok(Self {
            source: AudioSource::RealtimeMic,
            mic: Some(mic),
            speaker: None,
            data: None,
        })
    }

    /// Creates an AudioInput configured to capture audio from the system speaker.
    ///
    /// The returned `AudioInput` uses `AudioSource::RealtimeSpeaker`. The `speaker` field will
    /// contain `Some(SpeakerInput)` if speaker capture initialization succeeds, or `None` if it fails;
    /// `mic` and `data` are always `None`.
    ///
    /// # Examples
    ///
    /// ```
    /// let input = AudioInput::from_speaker();
    /// // `input` is configured for realtime speaker capture; speaker initialization may have failed.
    /// match input.source {
    ///     AudioSource::RealtimeSpeaker => {},
    ///     _ => panic!("expected RealtimeSpeaker"),
    /// }
    /// ```
    pub fn from_speaker() -> Self {
        tracing::debug!("Creating AudioInput from speaker");
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

        Self {
            source: AudioSource::RealtimeSpeaker,
            mic: None,
            speaker,
            data: None,
        }
    }

    pub fn from_recording(data: Vec<u8>) -> Self {
        Self {
            source: AudioSource::Recorded,
            mic: None,
            speaker: None,
            data: Some(data),
        }
    }

    pub fn device_name(&self) -> String {
        match &self.source {
            AudioSource::RealtimeMic => self.mic.as_ref().unwrap().device_name(),
            AudioSource::RealtimeSpeaker => "TODO".to_string(),
            AudioSource::Recorded => "TODO".to_string(),
        }
    }

    pub fn stream(&mut self) -> AudioStream {
        match &self.source {
            AudioSource::RealtimeMic => AudioStream::RealtimeMic {
                mic: self.mic.as_ref().unwrap().stream(),
            },
            AudioSource::RealtimeSpeaker => AudioStream::RealtimeSpeaker {
                speaker: self.speaker.take().unwrap().stream().unwrap(),
            },
            AudioSource::Recorded => AudioStream::Recorded {
                data: self.data.as_ref().unwrap().clone(),
                position: 0,
            },
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