use anyhow::Result;
use ca::aggregate_device_keys as agg_keys;
use cidre::{arc, av, cat, cf, core_audio as ca, ns, os};
use std::time::Duration;

use futures_util::StreamExt;
use rodio::buffer::SamplesBuffer;
use std::pin::Pin;

use crate::format::Format;

// https://github.com/yury/cidre/blob/23efaabee6bf75bfb57a9e7739b2beb83cb93942/cidre/examples/core-audio-record/main.rs
// https://github.com/floneum/floneum/blob/92129ec99aac446348f42bc6db326a6d1c2d99ae/interfaces/kalosm-sound/src/source/mic.rs#L41
#[cfg(target_os = "macos")]
pub struct SpeakerInput {}

// https://github.com/floneum/floneum/blob/92129ec99aac446348f42bc6db326a6d1c2d99ae/interfaces/kalosm-sound/src/source/mic.rs#L140
#[cfg(target_os = "macos")]
pub struct SpeakerStream {
    format: Format,
    read_data: Vec<f32>,
    receiver: Pin<Box<dyn futures_core::Stream<Item = f32> + Send + Sync>>,
}

impl futures_core::Stream for SpeakerStream {
    type Item = f32;

    fn poll_next(
        mut self: std::pin::Pin<&mut Self>,
        cx: &mut std::task::Context<'_>,
    ) -> std::task::Poll<Option<Self::Item>> {
        match self.receiver.as_mut().poll_next_unpin(cx) {
            std::task::Poll::Ready(Some(data_chunk)) => {
                self.read_data.push(data_chunk);
                std::task::Poll::Ready(Some(data_chunk))
            }
            std::task::Poll::Ready(None) => std::task::Poll::Ready(None),
            std::task::Poll::Pending => std::task::Poll::Pending,
        }
    }
}

// https://github.com/yury/cidre/blob/23efaabee6bf75bfb57a9e7739b2beb83cb93942/cidre/examples/core-audio-record/main.rs
impl SpeakerStream {
    pub fn new(format: Format) {}

    fn create_device(&self) {}

    fn start(&self) {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_main() {
        let format = Format::default();
        SpeakerStream::new(format)
    }
}
