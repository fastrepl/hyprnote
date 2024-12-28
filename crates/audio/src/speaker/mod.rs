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

    #[cfg(target_os = "macos")]
    pub fn stream(&self) -> Result<SpeakerStream> {
        let inner = self.inner.stream();
        Ok(SpeakerStream { inner })
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

    #[cfg(target_os = "macos")]
    fn poll_next(
        mut self: std::pin::Pin<&mut Self>,
        cx: &mut std::task::Context<'_>,
    ) -> std::task::Poll<Option<Self::Item>> {
        self.inner.poll_next_unpin(cx)
    }
}

impl SpeakerStream {
    pub fn read_sync(&mut self) -> Vec<f32> {
        self.inner.read_sync()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serial_test::serial;

    fn play_for_sec(seconds: u64) -> std::thread::JoinHandle<()> {
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
    #[test]
    #[serial]
    fn test_macos() {
        let handle = play_for_sec(1);
        let input = SpeakerInput::new().unwrap();
        let mut stream = input.stream().unwrap();

        std::thread::sleep(std::time::Duration::from_millis(500));

        let data = stream.read_sync();
        assert!(data.len() > 10);
        assert!(!data.iter().all(|x| *x == 0.0));

        handle.join().unwrap();
    }

    #[cfg(target_os = "windows")]
    #[test]
    #[serial]
    fn test_windows() {
        assert!(true);
    }
}
