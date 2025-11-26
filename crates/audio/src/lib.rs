mod device_monitor;
mod errors;
mod mic;
mod norm;
mod speaker;
mod utils;

pub use device_monitor::*;
pub use errors::*;
pub use mic::*;
pub use norm::*;
pub use speaker::*;
pub use utils::*;

pub use cpal;
use cpal::traits::{DeviceTrait, HostTrait};

use futures_util::Stream;
pub use kalosm_sound::AsyncSource;

pub const TAP_DEVICE_NAME: &str = "hypr-audio-tap";

pub trait AudioStreamProvider: 'static {
    fn stream(&mut self) -> AudioStream;
    fn device_name(&self) -> String;
    fn sample_rate(&self) -> u32;
}

pub trait AudioInputProvider: Send + Sync + 'static {
    type Stream: AudioStreamProvider;

    fn from_mic(&self, device_name: Option<String>) -> Result<Self::Stream, crate::Error>;
    fn from_speaker(&self) -> Self::Stream;
    fn get_default_device_name(&self) -> String;
    fn list_mic_devices(&self) -> Vec<String>;
}

pub struct RealAudioInputProvider;

impl AudioInputProvider for RealAudioInputProvider {
    type Stream = AudioInput;

    fn from_mic(&self, device_name: Option<String>) -> Result<Self::Stream, crate::Error> {
        AudioInput::from_mic(device_name)
    }

    fn from_speaker(&self) -> Self::Stream {
        AudioInput::from_speaker()
    }

    fn get_default_device_name(&self) -> String {
        AudioInput::get_default_device_name()
    }

    fn list_mic_devices(&self) -> Vec<String> {
        AudioInput::list_mic_devices()
    }
}

impl AudioStreamProvider for AudioInput {
    fn stream(&mut self) -> AudioStream {
        self.stream()
    }

    fn device_name(&self) -> String {
        self.device_name()
    }

    fn sample_rate(&self) -> u32 {
        self.sample_rate()
    }
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
        use rodio::{
            source::{Source, Zero},
            OutputStream, Sink,
        };

        let (tx, rx) = std::sync::mpsc::channel();

        std::thread::spawn(move || {
            if let Ok((_, stream)) = OutputStream::try_default() {
                let silence = Zero::<f32>::new(2, 48_000)
                    .take_duration(std::time::Duration::from_secs(1))
                    .repeat_infinite();

                let sink = Sink::try_new(&stream).unwrap();
                sink.append(silence);

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
    pub fn get_default_device_name() -> String {
        {
            let host = cpal::default_host();
            let device = host.default_input_device().unwrap();
            device.name().unwrap_or("Unknown Microphone".to_string())
        }
    }

    pub fn sample_rate(&self) -> u32 {
        match &self.source {
            AudioSource::RealtimeMic => self.mic.as_ref().unwrap().sample_rate(),
            AudioSource::RealtimeSpeaker => self.speaker.as_ref().unwrap().sample_rate(),
            AudioSource::Recorded => 16000,
        }
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
            data: None,
        })
    }

    pub fn from_speaker() -> Self {
        Self {
            source: AudioSource::RealtimeSpeaker,
            mic: None,
            speaker: Some(SpeakerInput::new().unwrap()),
            data: None,
        }
    }

    pub fn device_name(&self) -> String {
        match &self.source {
            AudioSource::RealtimeMic => self.mic.as_ref().unwrap().device_name(),
            AudioSource::RealtimeSpeaker => "RealtimeSpeaker".to_string(),
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

pub fn is_using_headphone() -> bool {
    #[cfg(target_os = "macos")]
    {
        utils::macos::is_headphone_from_default_output_device()
    }
    #[cfg(target_os = "linux")]
    {
        utils::linux::is_headphone_from_default_output_device()
    }
    #[cfg(not(any(target_os = "macos", target_os = "linux")))]
    {
        false
    }
}

#[cfg(any(test, feature = "mock"))]
pub mod mock {
    use super::*;

    pub struct MockAudioStream {
        samples: Vec<f32>,
        position: usize,
        device_name: String,
        sample_rate: u32,
    }

    impl MockAudioStream {
        pub fn new(samples: Vec<f32>, device_name: String) -> Self {
            Self {
                samples,
                position: 0,
                device_name,
                sample_rate: 16000,
            }
        }

        pub fn silence(duration_ms: u32) -> Self {
            let num_samples = (16000 * duration_ms / 1000) as usize;
            Self::new(vec![0.0; num_samples], "MockSilence".to_string())
        }

        pub fn sine_wave(frequency: f32, duration_ms: u32, amplitude: f32) -> Self {
            let num_samples = (16000 * duration_ms / 1000) as usize;
            let samples: Vec<f32> = (0..num_samples)
                .map(|i| {
                    (2.0 * std::f32::consts::PI * frequency * i as f32 / 16000.0).sin() * amplitude
                })
                .collect();
            Self::new(samples, "MockSineWave".to_string())
        }
    }

    impl AudioStreamProvider for MockAudioStream {
        fn stream(&mut self) -> AudioStream {
            let data: Vec<u8> = self
                .samples
                .iter()
                .flat_map(|&f| {
                    let sample_i16 = (f * 32767.0).clamp(-32768.0, 32767.0) as i16;
                    sample_i16.to_le_bytes()
                })
                .collect();

            AudioStream::Recorded { data, position: 0 }
        }

        fn device_name(&self) -> String {
            self.device_name.clone()
        }

        fn sample_rate(&self) -> u32 {
            self.sample_rate
        }
    }

    pub struct MockAudioInputProvider {
        pub default_device_name: String,
        pub mic_devices: Vec<String>,
        pub mic_samples: Vec<f32>,
        pub speaker_samples: Vec<f32>,
    }

    impl Default for MockAudioInputProvider {
        fn default() -> Self {
            Self {
                default_device_name: "MockMicrophone".to_string(),
                mic_devices: vec!["MockMicrophone".to_string()],
                mic_samples: vec![0.0; 16000],
                speaker_samples: vec![0.0; 16000],
            }
        }
    }

    impl AudioInputProvider for MockAudioInputProvider {
        type Stream = MockAudioStream;

        fn from_mic(&self, device_name: Option<String>) -> Result<Self::Stream, crate::Error> {
            let name = device_name.unwrap_or_else(|| self.default_device_name.clone());
            Ok(MockAudioStream::new(self.mic_samples.clone(), name))
        }

        fn from_speaker(&self) -> Self::Stream {
            MockAudioStream::new(self.speaker_samples.clone(), "MockSpeaker".to_string())
        }

        fn get_default_device_name(&self) -> String {
            self.default_device_name.clone()
        }

        fn list_mic_devices(&self) -> Vec<String> {
            self.mic_devices.clone()
        }
    }

    pub struct MockDeviceMonitorProvider;

    impl DeviceMonitorProvider for MockDeviceMonitorProvider {
        fn spawn(&self, _event_tx: std::sync::mpsc::Sender<DeviceEvent>) -> DeviceMonitorHandle {
            DeviceMonitorHandle::noop()
        }
    }
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
