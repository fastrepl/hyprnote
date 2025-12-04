use std::pin::Pin;
use std::task::{Context, Poll};

use futures_util::Stream;

pub struct SampleBuffer {
    buffer: Vec<f32>,
    position: usize,
}

impl SampleBuffer {
    pub fn new() -> Self {
        Self {
            buffer: Vec::new(),
            position: 0,
        }
    }

    pub fn is_empty(&self) -> bool {
        self.position >= self.buffer.len()
    }

    pub fn next_sample(&mut self) -> Option<f32> {
        if self.position < self.buffer.len() {
            let sample = self.buffer[self.position];
            self.position += 1;
            Some(sample)
        } else {
            None
        }
    }

    pub fn push_samples(&mut self, samples: Vec<f32>) {
        self.buffer = samples;
        self.position = 0;
    }

    pub fn clear(&mut self) {
        self.buffer.clear();
        self.position = 0;
    }
}

impl Default for SampleBuffer {
    fn default() -> Self {
        Self::new()
    }
}

/// A source of audio samples for use with [`BufferedAudioStream`].
///
/// # Contract
///
/// Implementations must follow these rules:
///
/// - Return `Poll::Ready(Some(samples))` only when `samples` is **non-empty**.
///   Returning an empty `Vec` violates this contract and may cause busy-looping.
///
/// - Return `Poll::Pending` when no samples are currently available but the
///   stream is not finished. The implementation **must** register the waker
///   from `cx` before returning `Pending` to ensure the task will be woken.
///
/// - Return `Poll::Ready(None)` to signal end of stream.
///
/// # Why empty samples are problematic
///
/// If an implementation returns `Ready(Some(vec![]))`, the wrapper will loop
/// and call `poll_samples` again immediately. If the implementation keeps
/// returning empty samples without ever returning `Pending`, this creates a
/// busy-loop that can starve other tasks on the executor.
pub trait SampleSource {
    fn poll_samples(&mut self, cx: &mut Context<'_>) -> Poll<Option<Vec<f32>>>;
}

pub struct BufferedAudioStream<S: SampleSource> {
    source: S,
    sample_rate: u32,
    buffer: SampleBuffer,
}

impl<S: SampleSource> BufferedAudioStream<S> {
    pub fn new(source: S, sample_rate: u32) -> Self {
        Self {
            source,
            sample_rate,
            buffer: SampleBuffer::new(),
        }
    }

    pub fn sample_rate(&self) -> u32 {
        self.sample_rate
    }
}

impl<S: SampleSource + Unpin> Stream for BufferedAudioStream<S> {
    type Item = f32;

    fn poll_next(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        loop {
            if let Some(sample) = self.buffer.next_sample() {
                return Poll::Ready(Some(sample));
            }

            match self.source.poll_samples(cx) {
                Poll::Ready(Some(samples)) => {
                    debug_assert!(
                        !samples.is_empty(),
                        "SampleSource returned empty Vec; this violates the trait contract and may cause busy-looping"
                    );
                    if samples.is_empty() {
                        continue;
                    }
                    self.buffer.push_samples(samples);
                }
                Poll::Ready(None) => return Poll::Ready(None),
                Poll::Pending => return Poll::Pending,
            }
        }
    }
}

impl<S: SampleSource + Unpin> kalosm_sound::AsyncSource for BufferedAudioStream<S> {
    fn as_stream(&mut self) -> impl Stream<Item = f32> + '_ {
        self
    }

    fn sample_rate(&self) -> u32 {
        self.sample_rate
    }
}
