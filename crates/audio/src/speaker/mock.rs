use futures_util::Stream;
use std::pin::Pin;
use std::sync::Arc;
use std::sync::atomic::{AtomicU32, Ordering};
use std::task::{Context, Poll};

pub struct MockInnerStream {
    chunks: Vec<Vec<f32>>,
    chunk_idx: usize,
    current_rate: Arc<AtomicU32>,
}

impl MockInnerStream {
    pub fn new(chunks: Vec<Vec<f32>>, initial_rate: u32) -> Self {
        Self {
            chunks,
            chunk_idx: 0,
            current_rate: Arc::new(AtomicU32::new(initial_rate)),
        }
    }

    pub fn rate_handle(&self) -> Arc<AtomicU32> {
        self.current_rate.clone()
    }

    pub fn sample_rate(&self) -> u32 {
        self.current_rate.load(Ordering::Acquire)
    }
}

impl Stream for MockInnerStream {
    type Item = Vec<f32>;

    fn poll_next(mut self: Pin<&mut Self>, _cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        if self.chunk_idx < self.chunks.len() {
            let chunk = self.chunks[self.chunk_idx].clone();
            self.chunk_idx += 1;
            Poll::Ready(Some(chunk))
        } else {
            Poll::Ready(None)
        }
    }
}
