mod device_monitor;
mod errors;
mod mic;
mod mixed;
mod norm;
mod resampler;
mod speaker;
mod utils;

pub use device_monitor::*;
pub use errors::*;
pub use mic::*;
pub use mixed::*;
pub use norm::*;
pub use resampler::*;
pub use speaker::*;
pub use utils::*;

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
    RealtimeMixed,
    Recorded,
}

pub struct AudioInput {
    source: AudioSource,
    mic: Option<MicInput>,
    speaker: Option<SpeakerInput>,
    mixed: Option<MixedInput>,
    data: Option<Vec<u8>>,
}

impl AudioInput {
    pub fn get_default_device_name() -> String {
        let name = {
            let host = cpal::default_host();
            let device = host.default_input_device().unwrap();
            device.name().unwrap_or("Unknown Microphone".to_string())
        };

        name
    }

    pub fn list_mic_devices() -> Vec<String> {
        let host = cpal::default_host();

        let devices: Vec<cpal::Device> = host
            .input_devices()
            .map(|devices| devices.collect())
            .unwrap_or_else(|_| Vec::new());

        devices
            .into_iter()
            .filter_map(|d| d.name().ok())
            .filter(|d| d != "hypr-audio-tap")
            .collect()
    }

    pub fn from_mic(device_name: Option<String>) -> Result<Self, crate::Error> {
        let mic = MicInput::new(device_name)?;

        Ok(Self {
            source: AudioSource::RealtimeMic,
            mic: Some(mic),
            speaker: None,
            mixed: None,
            data: None,
        })
    }

    pub fn from_speaker() -> Self {
        Self {
            source: AudioSource::RealtimeSpeaker,
            mic: None,
            speaker: Some(SpeakerInput::new().unwrap()),
            mixed: None,
            data: None,
        }
    }

    #[cfg(target_os = "macos")]
    pub fn from_mixed() -> Result<Self, crate::Error> {
        let mixed = MixedInput::new().unwrap();

        Ok(Self {
            source: AudioSource::RealtimeMixed,
            mic: None,
            speaker: None,
            mixed: Some(mixed),
            data: None,
        })
    }

    pub fn from_recording(data: Vec<u8>) -> Self {
        Self {
            source: AudioSource::Recorded,
            mic: None,
            speaker: None,
            mixed: None,
            data: Some(data),
        }
    }

    pub fn device_name(&self) -> String {
        match &self.source {
            AudioSource::RealtimeMic => self.mic.as_ref().unwrap().device_name(),
            AudioSource::RealtimeSpeaker => "RealtimeSpeaker".to_string(),
            AudioSource::RealtimeMixed => "Mixed Audio".to_string(),
            AudioSource::Recorded => "Recorded".to_string(),
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
            AudioSource::RealtimeMixed => AudioStream::RealtimeMixed {
                mixed: self.mixed.take().unwrap().stream().unwrap(),
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
    RealtimeMixed { mixed: MixedStream },
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
            AudioStream::RealtimeMixed { mixed } => mixed.poll_next_unpin(cx),
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
            AudioStream::RealtimeMixed { mixed } => mixed.sample_rate(),
            AudioStream::Recorded { .. } => 16000,
        }
    }
}

pub fn is_using_headphone() -> bool {
    let headphone = {
        #[cfg(target_os = "macos")]
        {
            utils::macos::is_headphone_from_default_output_device()
        }
        #[cfg(not(target_os = "macos"))]
        {
            false
        }
    };

    headphone
}

#[cfg(test)]
pub(crate) fn play_sine_for_sec(seconds: u64) -> std::thread::JoinHandle<()> {
    use rodio::{
        cpal::SampleRate,
        source::{Function::Sine, SignalGenerator, Source},
        OutputStream,
    };
    use std::{
        thread::{sleep, spawn},
        time::Duration,
    };

    spawn(move || {
        let (_stream, stream_handle) = OutputStream::try_default().unwrap();
        let source = SignalGenerator::new(SampleRate(44100), 440.0, Sine);

        let source = source
            .convert_samples()
            .take_duration(Duration::from_secs(seconds))
            .amplify(0.01);

        stream_handle.play_raw(source).unwrap();
        sleep(Duration::from_secs(seconds));
    })
}
