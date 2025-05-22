use futures_util::Stream;
use std::{
    pin::Pin,
    task::{Context, Poll},
    time::Duration,
};

use kalosm_sound::AsyncSource;
use rodio::buffer::SamplesBuffer;
use voice_activity_detector::{IteratorExt, VoiceActivityDetector};

pub struct ChunkStream<S: AsyncSource + Unpin> {
    source: S,
    vad: VoiceActivityDetector,
    buffer: Vec<f32>,
    max_duration: Duration,
}

impl<S: AsyncSource + Unpin> ChunkStream<S> {
    pub fn new(source: S, vad: VoiceActivityDetector, max_duration: Duration) -> Self {
        Self {
            source,
            vad,
            buffer: Vec::new(),
            max_duration,
        }
    }

    fn max_samples(&self) -> usize {
        (self.source.sample_rate() as f64 * self.max_duration.as_secs_f64()) as usize
    }

    fn samples_for_duration(&self, duration: Duration) -> usize {
        (self.source.sample_rate() as f64 * duration.as_secs_f64()) as usize
    }
}

impl<S: AsyncSource + Unpin> Stream for ChunkStream<S> {
    type Item = SamplesBuffer<f32>;

    fn poll_next(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        let this = self.get_mut();
        let max_samples = this.max_samples();
        let sample_rate = this.source.sample_rate();

        let min_buffer_samples = this.samples_for_duration(Duration::from_secs(6));
        let stream = this.source.as_stream();
        let mut stream = std::pin::pin!(stream);

        while this.buffer.len() < max_samples {
            match stream.as_mut().poll_next(cx) {
                Poll::Ready(Some(sample)) => {
                    this.buffer.push(sample);

                    if this.buffer.len() >= min_buffer_samples {
                        let data = std::mem::take(&mut this.buffer);
                        let speech = filter_speech_chunks(&mut this.vad, data);
                        if !speech.is_empty() {
                            return Poll::Ready(Some(SamplesBuffer::new(1, sample_rate, speech)));
                        }
                    }
                }
                Poll::Ready(None) if !this.buffer.is_empty() => {
                    let data = std::mem::take(&mut this.buffer);
                    let speech = filter_speech_chunks(&mut this.vad, data);
                    if speech.is_empty() {
                        return Poll::Ready(None);
                    } else {
                        return Poll::Ready(Some(SamplesBuffer::new(1, sample_rate, speech)));
                    }
                }
                Poll::Ready(None) => return Poll::Ready(None),
                Poll::Pending => return Poll::Pending,
            }
        }

        let data = this.buffer.drain(0..max_samples);
        let speech = filter_speech_chunks(&mut this.vad, data);
        if speech.is_empty() {
            Poll::Pending
        } else {
            Poll::Ready(Some(SamplesBuffer::new(1, sample_rate, speech)))
        }
    }
}

// helper function to filter speech chunks
fn filter_speech_chunks<D: IntoIterator<Item = f32>>(
    vad: &mut VoiceActivityDetector,
    data: D,
) -> Vec<f32> {
    data.into_iter()
        .label(vad, 0.75, 3)
        .filter_map(|label| {
            if label.is_speech() {
                Some(label.into_iter())
            } else {
                None
            }
        })
        .flatten()
        .collect()
}
