use std::{
    pin::Pin,
    task::{Context, Poll},
    time::Duration,
};

use futures_util::Stream;
use kalosm_sound::AsyncSource;
use rodio::buffer::SamplesBuffer;

#[allow(dead_code)]
trait FixedChunkExt: AsyncSource {
    fn fixed_chunks(self, chunk_duration: Duration) -> FixedChunkStream<Self>
    where
        Self: Sized + Unpin,
    {
        FixedChunkStream::new(self, chunk_duration)
    }
}

impl<S: AsyncSource> FixedChunkExt for S {}

pub struct FixedChunkStream<S: AsyncSource + Unpin> {
    source: S,
    buffer: Vec<f32>,
    chunk_duration: Duration,
}

impl<S: AsyncSource + Unpin> FixedChunkStream<S> {
    pub fn new(source: S, chunk_duration: Duration) -> Self {
        Self {
            source,
            buffer: Vec::new(),
            chunk_duration,
        }
    }

    fn samples_per_chunk(&self) -> usize {
        (self.source.sample_rate() as f64 * self.chunk_duration.as_secs_f64()) as usize
    }
}

impl<S: AsyncSource + Unpin> Stream for FixedChunkStream<S> {
    type Item = SamplesBuffer<f32>;

    fn poll_next(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        let this = self.get_mut();
        let samples_needed = this.samples_per_chunk();
        let sample_rate = this.source.sample_rate();

        let stream = this.source.as_stream();
        let mut stream = std::pin::pin!(stream);

        while this.buffer.len() < samples_needed {
            match stream.as_mut().poll_next(cx) {
                Poll::Ready(Some(sample)) => {
                    this.buffer.push(sample);
                }
                Poll::Ready(None) if !this.buffer.is_empty() => {
                    let data = std::mem::take(&mut this.buffer);
                    return Poll::Ready(Some(SamplesBuffer::new(1, sample_rate, data)));
                }
                Poll::Ready(None) => return Poll::Ready(None),
                Poll::Pending => return Poll::Pending,
            }
        }

        let chunk: Vec<_> = this.buffer.drain(0..samples_needed).collect();
        Poll::Ready(Some(SamplesBuffer::new(1, sample_rate, chunk)))
    }
}
