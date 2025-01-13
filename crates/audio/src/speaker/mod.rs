use anyhow::Result;
use futures::StreamExt;

#[cfg(target_os = "macos")]
mod macos;

#[cfg(target_os = "windows")]
mod windows;

// https://github.com/floneum/floneum/blob/92129ec99aac446348f42bc6db326a6d1c2d99ae/interfaces/kalosm-sound/src/source/mic.rs#L41
pub struct SpeakerInput {
    #[cfg(target_os = "macos")]
    inner: macos::SpeakerInput,
    #[cfg(target_os = "windows")]
    inner: windows::SpeakerInput,
}

impl SpeakerInput {
    #[cfg(target_os = "macos")]
    pub fn new() -> Result<Self> {
        let inner = macos::SpeakerInput::new()?;
        Ok(Self { inner })
    }

    #[cfg(not(any(target_os = "macos")))]
    pub fn new() -> Result<Self> {
        Err(anyhow::anyhow!(
            "'SpeakerInput::new' is not supported on this platform"
        ))
    }

    #[cfg(any(target_os = "macos", target_os = "windows"))]
    pub fn stream(&self) -> Result<SpeakerStream> {
        let inner = self.inner.stream();
        Ok(SpeakerStream { inner })
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    pub fn stream(&self) -> Result<SpeakerStream> {
        Err(anyhow::anyhow!(
            "'SpeakerInput::stream' is not supported on this platform"
        ))
    }
}

// https://github.com/floneum/floneum/blob/92129ec99aac446348f42bc6db326a6d1c2d99ae/interfaces/kalosm-sound/src/source/mic.rs#L140
pub struct SpeakerStream {
    #[cfg(target_os = "macos")]
    inner: macos::SpeakerStream,
    #[cfg(target_os = "windows")]
    inner: windows::SpeakerStream,
}

impl futures_core::Stream for SpeakerStream {
    type Item = f32;

    fn poll_next(
        mut self: std::pin::Pin<&mut Self>,
        cx: &mut std::task::Context<'_>,
    ) -> std::task::Poll<Option<Self::Item>> {
        #[cfg(any(target_os = "macos", target_os = "windows"))]
        {
            self.inner.poll_next_unpin(cx)
        }

        #[cfg(not(any(target_os = "macos", target_os = "windows")))]
        {
            std::task::Poll::Pending
        }
    }
}

impl kalosm_sound::AsyncSource for SpeakerStream {
    fn as_stream(&mut self) -> impl futures::Stream<Item = f32> + '_ {
        self
    }

    #[cfg(any(target_os = "macos", target_os = "windows"))]
    fn sample_rate(&self) -> u32 {
        self.inner.sample_rate()
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    fn sample_rate(&self) -> u32 {
        0
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use kalosm_sound::AsyncSource;
    use serial_test::serial;

    fn play_sine_for_sec(seconds: u64) -> std::thread::JoinHandle<()> {
        use rodio::{
            cpal::SampleRate,
            source::{Function::Sine, SignalGenerator, Source},
            OutputStream,
        };
        use std::{
            thread::{sleep, spawn},
            time::Duration,
        };

        spawn(move || {
            let (_stream, stream_handle) = OutputStream::try_default().unwrap();
            let source = SignalGenerator::new(SampleRate(44100), 440.0, Sine);

            let source = source
                .convert_samples()
                .take_duration(Duration::from_secs(seconds))
                .amplify(0.01);

            stream_handle.play_raw(source).unwrap();
            sleep(Duration::from_secs(seconds));
        })
    }

    #[cfg(target_os = "macos")]
    #[tokio::test]
    #[serial]
    async fn test_macos() {
        let _handle = play_sine_for_sec(1);
        let input = SpeakerInput::new().unwrap();
        let mut stream = input.stream().unwrap();

        let samples_1 = stream.read_samples(44100 * 1).await;
        assert!(samples_1.count() == 44100 * 1);

        let mut samples_2 = stream.read_samples(44100 * 1).await;
        assert!(samples_2.any(|x| x != 0.0));
    }

    #[cfg(target_os = "windows")]
    #[test]
    #[serial]
    fn test_windows() {
        assert!(true);
    }
}
