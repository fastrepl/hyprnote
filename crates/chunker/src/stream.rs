use futures_util::Stream;
use std::{
    pin::Pin,
    task::{Context, Poll},
    time::Duration,
};

use kalosm_sound::AsyncSource;
use rodio::buffer::SamplesBuffer;

use crate::{ChunkProcessor, Predictor};

pub struct ChunkStream<S: AsyncSource + Unpin, P: Predictor + Unpin> {
    source: S,
    buffer: Vec<f32>,
    processor: ChunkProcessor<P>,
}

impl<S: AsyncSource + Unpin, P: Predictor + Unpin> ChunkStream<S, P> {
    pub fn new(source: S, predictor: P) -> Self {
        Self {
            source,
            buffer: Vec::new(),
            processor: ChunkProcessor::new(predictor),
        }
    }

    fn samples_for_duration(&self, duration: Duration) -> usize {
        (self.source.sample_rate() as f64 * duration.as_secs_f64()) as usize
    }
}

impl<S: AsyncSource + Unpin, P: Predictor + Unpin> Stream for ChunkStream<S, P> {
    type Item = SamplesBuffer<f32>;

    fn poll_next(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        let this = self.get_mut();
        let sr = this.source.sample_rate();

        let stream = this.source.as_stream();
        let mut stream = std::pin::pin!(stream);

        loop {
            if this.buffer.len() >= this.processor.window_samples(sr) {
                break;
            }

            match stream.as_mut().poll_next(cx) {
                Poll::Ready(Some(sample)) => this.buffer.push(sample),
                Poll::Ready(None) if !this.buffer.is_empty() => break,
                Poll::Ready(None) => return Poll::Ready(None),
                Poll::Pending => return Poll::Pending,
            }
        }

        if let Ok(Some(chunk)) = this.processor.process(&this.buffer) {
            this.buffer.clear();
            let data = SamplesBuffer::new(1, sr, chunk);
            return Poll::Ready(Some(data));
        }

        this.buffer.clear();
        cx.waker().wake_by_ref();
        Poll::Pending
    }
}
