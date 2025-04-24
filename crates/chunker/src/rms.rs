use futures_util::Stream;
use std::{
    pin::Pin,
    task::{Context, Poll},
    time::Duration,
};

use kalosm_sound::AsyncSource;
use rodio::buffer::SamplesBuffer;

const SILENCE_THRESHOLD: f32 = 0.009;

#[allow(dead_code)]
trait RmsChunkExt: AsyncSource {
    fn rms_chunks(self, chunk_duration: Duration) -> RmsChunkStream<Self>
    where
        Self: Sized + Unpin,
    {
        RmsChunkStream::new(self, chunk_duration)
    }
}

impl<S: AsyncSource> RmsChunkExt for S {}

pub struct RmsChunkStream<S: AsyncSource + Unpin> {
    source: S,
    buffer: Vec<f32>,
    max_duration: Duration,
}

impl<S: AsyncSource + Unpin> RmsChunkStream<S> {
    pub fn new(source: S, max_duration: Duration) -> Self {
        Self {
            source,
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

impl<S: AsyncSource + Unpin> Stream for RmsChunkStream<S> {
    type Item = SamplesBuffer<f32>;

    fn poll_next(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        let this = self.get_mut();
        let max_samples = this.max_samples();
        let sample_rate = this.source.sample_rate();

        let min_buffer_samples = this.samples_for_duration(Duration::from_secs(6));
        let silence_window_samples = this.samples_for_duration(Duration::from_millis(500));

        let stream = this.source.as_stream();
        let mut stream = std::pin::pin!(stream);

        while this.buffer.len() < max_samples {
            match stream.as_mut().poll_next(cx) {
                Poll::Ready(Some(sample)) => {
                    this.buffer.push(sample);

                    if this.buffer.len() >= min_buffer_samples {
                        let buffer_len = this.buffer.len();
                        let silence_start = buffer_len.saturating_sub(silence_window_samples);
                        let last_samples = &this.buffer[silence_start..buffer_len];

                        let sum_squares: f32 = last_samples.iter().map(|&x| x * x).sum();
                        let mean_square = sum_squares / last_samples.len() as f32;
                        let rms_value = mean_square.sqrt();

                        if rms_value < SILENCE_THRESHOLD {
                            let mut data = std::mem::take(&mut this.buffer);
                            trim(&mut data);

                            return Poll::Ready(Some(SamplesBuffer::new(1, sample_rate, data)));
                        }
                    }
                }
                Poll::Ready(None) if !this.buffer.is_empty() => {
                    let mut data = std::mem::take(&mut this.buffer);
                    trim(&mut data);

                    return Poll::Ready(Some(SamplesBuffer::new(1, sample_rate, data)));
                }
                Poll::Ready(None) => return Poll::Ready(None),
                Poll::Pending => return Poll::Pending,
            }
        }

        let mut chunk: Vec<_> = this.buffer.drain(0..max_samples).collect();
        trim(&mut chunk);

        Poll::Ready(Some(SamplesBuffer::new(1, sample_rate, chunk)))
    }
}

fn trim(data: &mut Vec<f32>) {
    const WINDOW_SIZE: usize = 100;

    let mut i = 0;
    for start_idx in (0..data.len()).step_by(WINDOW_SIZE) {
        let end_idx = (start_idx + WINDOW_SIZE).min(data.len());
        let window = &data[start_idx..end_idx];

        let sum_squares: f32 = window.iter().map(|&x| x * x).sum();
        let mean_square = sum_squares / window.len() as f32;
        let rms_value = mean_square.sqrt();

        if rms_value >= SILENCE_THRESHOLD {
            i = start_idx;
            break;
        }
    }

    data.drain(0..i);
}
