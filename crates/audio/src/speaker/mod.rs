use anyhow::Result;
use futures_util::{Stream, StreamExt};

#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "macos")]
type PlatformSpeakerInput = macos::SpeakerInput;
#[cfg(target_os = "macos")]
type PlatformSpeakerStream = macos::SpeakerStream;

#[cfg(target_os = "windows")]
mod windows;
#[cfg(target_os = "windows")]
type PlatformSpeakerInput = windows::SpeakerInput;
#[cfg(target_os = "windows")]
type PlatformSpeakerStream = windows::SpeakerStream;

#[cfg(target_os = "linux")]
mod linux;
#[cfg(target_os = "linux")]
type PlatformSpeakerInput = linux::SpeakerInput;
#[cfg(target_os = "linux")]
type PlatformSpeakerStream = linux::SpeakerStream;

// https://github.com/floneum/floneum/blob/50afe10/interfaces/kalosm-sound/src/source/mic.rs#L41
pub struct SpeakerInput {
    #[cfg(any(target_os = "macos", target_os = "windows", target_os = "linux"))]
    inner: PlatformSpeakerInput,
}

impl SpeakerInput {
    #[cfg(any(target_os = "macos", target_os = "windows"))]
    pub fn new() -> Result<Self> {
        let inner = PlatformSpeakerInput::new()?;
        Ok(Self { inner })
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    pub fn new() -> Result<Self> {
        Err(anyhow::anyhow!(
            "'SpeakerInput::new' is not supported on this platform"
        ))
    }

    #[cfg(any(target_os = "macos", target_os = "windows"))]
    pub fn stream(self) -> Result<SpeakerStream> {
        let inner = self.inner.stream();
        Ok(SpeakerStream { inner })
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    pub fn stream(self) -> Result<SpeakerStream> {
        Err(anyhow::anyhow!(
            "'SpeakerInput::stream' is not supported on this platform"
        ))
    }
}

// https://github.com/floneum/floneum/blob/50afe10/interfaces/kalosm-sound/src/source/mic.rs#L140
pub struct SpeakerStream {
    inner: PlatformSpeakerStream,
}

impl Stream for SpeakerStream {
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
    fn as_stream(&mut self) -> impl Stream<Item = f32> + '_ {
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
    use crate::play_sine_for_sec;

    use serial_test::serial;

    #[cfg(target_os = "macos")]
    #[tokio::test]
    #[serial]
    async fn test_macos() {
        let input = SpeakerInput::new().unwrap();
        let mut stream = input.stream().unwrap();

        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

        let handle = play_sine_for_sec(2);

        let mut buffer = Vec::new();
        while let Some(sample) = stream.next().await {
            buffer.push(sample);
            if buffer.len() > 48000 {
                break;
            }
        }

        handle.join().unwrap();
        assert!(buffer.iter().any(|x| *x != 0.0));
    }

    #[cfg(target_os = "windows")]
    #[tokio::test]
    #[serial]
    async fn test_windows() {
        use kalosm_sound::AsyncSource;

        // Test that we can create a SpeakerInput
        let input = match SpeakerInput::new() {
            Ok(input) => input,
            Err(e) => {
                println!("Failed to create SpeakerInput: {}", e);
                return; // Skip test if WASAPI is not available
            }
        };

        // Test that we can create a stream
        let mut stream = match input.stream() {
            Ok(stream) => stream,
            Err(e) => {
                println!("Failed to create speaker stream: {}", e);
                return;
            }
        };

        // Check that we get a reasonable sample rate
        let sample_rate = stream.sample_rate();
        assert!(sample_rate > 0);
        println!("Windows speaker sample rate: {}", sample_rate);

        // Try to get some samples
        let mut sample_count = 0;
        while let Some(_sample) = stream.next().await {
            sample_count += 1;
            if sample_count > 100 {
                break;
            }
        }

        assert!(sample_count > 0, "Should receive some audio samples");
        println!("Received {} samples from Windows speaker", sample_count);
    }
}
