mod mic;
mod source;
mod speaker;
mod stream;

pub use mic::*;
pub use source::*;
pub use speaker::*;
pub use stream::*;

pub use dasp::sample::Sample;

pub struct AudioOutput {}

impl AudioOutput {
    pub fn to_speaker(bytes: &'static [u8]) {
        use rodio::{Decoder, OutputStream, Sink};

        std::thread::spawn(move || {
            if let Ok((_, stream)) = OutputStream::try_default() {
                let file = std::io::Cursor::new(bytes);
                let source = Decoder::new(file).unwrap();

                let sink = Sink::try_new(&stream).unwrap();
                sink.append(source);
                sink.sleep_until_end();
            }
        });
    }

    pub fn to_speaker_raw(bytes: &'static [u8]) {
        use rodio::{OutputStream, Sink};

        std::thread::spawn(move || {
            if let Ok((_, stream)) = OutputStream::try_default() {
                let source = rodio::buffer::SamplesBuffer::new(
                    1,
                    16000,
                    bytes
                        .chunks_exact(2)
                        .map(|chunk| i16::from_le_bytes([chunk[0], chunk[1]]) as f32 / 32768.0)
                        .collect::<Vec<f32>>(),
                );

                let sink = Sink::try_new(&stream).unwrap();
                sink.append(source);
                sink.sleep_until_end();
            }
        });
    }
}

pub enum AudioSource {
    RealTime,
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
    pub fn new() -> Self {
        Self {
            source: AudioSource::RealTime,
            mic: Some(MicInput::default()),
            speaker: Some(SpeakerInput::new().unwrap()),
            data: None,
        }
    }

    pub fn from_mic() -> Self {
        Self {
            source: AudioSource::RealtimeMic,
            mic: Some(MicInput::default()),
            speaker: None,
            data: None,
        }
    }

    pub fn from_speaker() -> Self {
        Self {
            source: AudioSource::RealtimeSpeaker,
            mic: None,
            speaker: Some(SpeakerInput::new().unwrap()),
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

    pub fn stream(&self) -> AudioStream {
        match &self.source {
            AudioSource::RealtimeMic => AudioStream::RealtimeMic {
                mic: self.mic.as_ref().unwrap().stream(),
            },
            AudioSource::RealtimeSpeaker => AudioStream::RealtimeSpeaker {
                speaker: self.speaker.as_ref().unwrap().stream().unwrap(),
            },
            AudioSource::RealTime => {
                let mic_stream = self.mic.as_ref().unwrap().stream();
                let speaker_stream = self.speaker.as_ref().unwrap().stream().unwrap();

                let mic_sample_rate = mic_stream.sample_rate();
                let speaker_sample_rate = speaker_stream.sample_rate();
                let sample_rate = std::cmp::min(mic_sample_rate, speaker_sample_rate);

                AudioStream::RealTime {
                    mic: mic_stream.resample(sample_rate),
                    speaker: speaker_stream.resample(sample_rate),
                }
            }
            AudioSource::Recorded => AudioStream::Recorded {
                data: self.data.as_ref().unwrap().clone(),
                position: 0,
            },
        }
    }
}

pub enum AudioStream {
    RealTime {
        mic: ResampledAsyncSource<MicStream>,
        speaker: ResampledAsyncSource<SpeakerStream>,
    },
    RealtimeMic {
        mic: MicStream,
    },
    RealtimeSpeaker {
        speaker: SpeakerStream,
    },
    Recorded {
        data: Vec<u8>,
        position: usize,
    },
}

impl futures_core::Stream for AudioStream {
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
            AudioStream::RealTime { mic, speaker } => {
                match (mic.poll_next_unpin(cx), speaker.poll_next_unpin(cx)) {
                    (Poll::Ready(Some(mic)), Poll::Ready(Some(speaker))) => {
                        let mixed = if mic.abs() < 1e-6 {
                            speaker
                        } else if speaker.abs() < 1e-6 {
                            mic
                        } else {
                            (mic + speaker) * 0.7071
                        };
                        Poll::Ready(Some(mixed))
                    }
                    (Poll::Ready(Some(mic)), _) => Poll::Ready(Some(mic)),
                    (_, Poll::Ready(Some(speaker))) => Poll::Ready(Some(speaker)),
                    (Poll::Ready(None), Poll::Ready(None)) => Poll::Ready(None),
                    _ => Poll::Pending,
                }
            }
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

impl crate::AsyncSource for AudioStream {
    fn as_stream(&mut self) -> impl futures_core::Stream<Item = f32> + '_ {
        self
    }

    fn sample_rate(&self) -> u32 {
        match self {
            AudioStream::RealtimeMic { mic } => mic.sample_rate(),
            AudioStream::RealtimeSpeaker { speaker } => speaker.sample_rate(),
            AudioStream::RealTime { mic, .. } => mic.sample_rate(),
            AudioStream::Recorded { .. } => 16000,
        }
    }
}
