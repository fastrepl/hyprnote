use futures::{Stream, StreamExt};
use std::{
    pin::{pin, Pin},
    task::{Context, Poll},
};

use kalosm_sound::AsyncSource;

pub struct MixedStream<S1, S2>
where
    S1: AsyncSource + Unpin,
    S2: AsyncSource + Unpin,
{
    source1: S1,
    source2: S2,
}

impl<S1, S2> MixedStream<S1, S2>
where
    S1: AsyncSource + Unpin,
    S2: AsyncSource + Unpin,
{
    pub fn new(source1: S1, source2: S2) -> Self {
        Self { source1, source2 }
    }
}

impl<S1, S2> Stream for MixedStream<S1, S2>
where
    S1: AsyncSource + Unpin,
    S2: AsyncSource + Unpin,
{
    type Item = f32;

    fn poll_next(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        let this = self.get_mut();
        let s1 = pin!(this.source1.as_stream());
        let s2 = pin!(this.source2.as_stream());
        

        let s1_sample = s1.poll_next(cx);
        let s2_sample = s2.poll_next(cx);

        println!("s1_sample: {:?}", s1_sample);
        println!("s2_sample: {:?}", s2_sample);

        match (s1_sample, s2_sample) {
            (Poll::Ready(Some(v1)), Poll::Ready(Some(v2))) => Poll::Ready(Some(v1 + v2)),
            (Poll::Ready(Some(v1)), _) => Poll::Ready(Some(v1)),
            (_, Poll::Ready(Some(v2))) => Poll::Ready(Some(v2)),
            (Poll::Ready(None), Poll::Ready(None)) => Poll::Ready(None),
            _ => Poll::Pending,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{MicInput, SpeakerInput};
    use futures::StreamExt;
    use std::time::Duration;

    fn play_sine_for_sec(seconds: u64) -> std::thread::JoinHandle<()> {
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

    // cargo test test_mixer -p audio -- --nocapture
    #[tokio::test]
    async fn test_mixer() {
        let _handle = play_sine_for_sec(1);
        
        let mic = MicInput::default().stream().unwrap();
        let speaker = SpeakerInput::new().unwrap().stream().unwrap();

        let mixed_stream = MixedStream::new(mic, speaker);

        let result = tokio::time::timeout(
            Duration::from_secs(2),
            mixed_stream.take(1024).ready_chunks(1024).collect::<Vec<_>>(),
        )
        .await;

        // Make sure we got some data
        assert!(result.is_ok());
        println!("result: {:?}", result);
        let chunks = result.unwrap();
        assert!(!chunks.is_empty());
        println!("Collected {} chunks of audio data", chunks.len());
    }
}
