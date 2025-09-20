use anyhow::Result;
use futures_util::{Stream, StreamExt};

#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "macos")]
type PlatformMixedInput = macos::MixedInput;
#[cfg(target_os = "macos")]
type PlatformMixedStream = macos::MixedStream;

#[cfg(not(target_os = "macos"))]
mod other;
#[cfg(not(target_os = "macos"))]
type PlatformMixedInput = other::MixedInput;
#[cfg(not(target_os = "macos"))]
type PlatformMixedStream = other::MixedStream;

pub struct MixedInput {
    inner: PlatformMixedInput,
}

impl MixedInput {
    pub fn new() -> Result<Self> {
        let inner = PlatformMixedInput::new()?;
        Ok(Self { inner })
    }

    pub fn stream(self) -> Result<MixedStream> {
        let inner = self.inner.stream();
        Ok(MixedStream { inner })
    }
}

pub struct MixedStream {
    inner: PlatformMixedStream,
}

impl Stream for MixedStream {
    type Item = f32;

    fn poll_next(
        mut self: std::pin::Pin<&mut Self>,
        cx: &mut std::task::Context<'_>,
    ) -> std::task::Poll<Option<Self::Item>> {
        self.inner.poll_next_unpin(cx)
    }
}

impl kalosm_sound::AsyncSource for MixedStream {
    fn as_stream(&mut self) -> impl Stream<Item = f32> + '_ {
        self
    }

    fn sample_rate(&self) -> u32 {
        #[cfg(target_os = "macos")]
        {
            self.inner.sample_rate()
        }
        #[cfg(not(target_os = "macos"))]
        {
            0
        }
    }
}
