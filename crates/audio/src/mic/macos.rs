use std::{
    pin::Pin,
    task::{Context, Poll},
};

use futures_util::Stream;
use kalosm_sound::AsyncSource;

#[derive(Default)]
pub struct MicInput {}

impl MicInput {
    pub fn stream(&self) -> MicStream {
        MicStream { sample_rate: 44100 }
    }
}

pub struct MicStream {
    sample_rate: u32,
}

impl Stream for MicStream {
    type Item = f32;

    fn poll_next(self: Pin<&mut Self>, _cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        Poll::Pending
    }
}

impl AsyncSource for MicStream {
    fn as_stream(&mut self) -> impl Stream<Item = f32> + '_ {
        self
    }

    fn sample_rate(&self) -> u32 {
        self.sample_rate
    }
}

#[test]
fn assert_mic_stream_send_sync() {
    fn assert_sync<T: Sync>() {}
    assert_sync::<MicStream>();
    fn assert_send<T: Send>() {}
    assert_send::<MicStream>();
}
