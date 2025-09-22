use anyhow::Result;
use futures_util::Stream;
use std::task::Poll;

pub struct MixedInput {}

impl MixedInput {
    pub fn new() -> Result<Self> {
        Ok(Self {})
    }

    pub fn stream(self) -> MixedStream {
        MixedStream {}
    }
}

pub struct MixedStream {}

impl Stream for MixedStream {
    type Item = f32;

    fn poll_next(
        mut self: std::pin::Pin<&mut Self>,
        cx: &mut std::task::Context<'_>,
    ) -> Poll<Option<Self::Item>> {
        Poll::Pending
    }
}
