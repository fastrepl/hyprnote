mod mic;
mod speaker;
mod stream;

pub use mic::*;
pub use speaker::*;
pub use stream::*;

pub use kalosm_sound::{
    AsyncSource, AsyncSourceTranscribeExt, DenoisedExt, ResampledAsyncSource,
    TranscribeChunkedAudioStreamExt, VoiceActivityDetectorExt, VoiceActivityStreamExt,
};

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
    pub fn from_mic() -> Self {
        Self {
            source: AudioSource::RealtimeMic,
            mic: Some(MicInput::default()),
            speaker: None,
            data: None,
        }
    }

    pub fn from_speaker(sample_rate_override: Option<u32>) -> Self {
        Self {
            source: AudioSource::RealtimeSpeaker,
            mic: None,
            speaker: Some(SpeakerInput::new(sample_rate_override).unwrap()),
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
    fn as_stream(&mut self) -> impl futures_core::Stream<Item = f32> + '_ {
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
