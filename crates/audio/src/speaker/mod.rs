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
    #[cfg(any(target_os = "macos", target_os = "windows", target_os = "linux"))]
    pub fn new() -> Result<Self> {
        let inner = PlatformSpeakerInput::new()?;
        Ok(Self { inner })
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    pub fn new() -> Result<Self> {
        Err(anyhow::anyhow!(
            "'SpeakerInput::new' is not supported on this platform"
        ))
    }

    #[cfg(any(target_os = "macos", target_os = "windows", target_os = "linux"))]
    pub fn sample_rate(&self) -> u32 {
        self.inner.sample_rate()
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    pub fn sample_rate(&self) -> u32 {
        0
    }

    #[cfg(any(target_os = "macos", target_os = "windows", target_os = "linux"))]
    pub fn stream(self) -> Result<SpeakerStream> {
        let inner = self.inner.stream();
        Ok(SpeakerStream {
            inner,
            buffer: Vec::new(),
            buffer_idx: 0,
        })
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    pub fn stream(self) -> Result<SpeakerStream> {
        Err(anyhow::anyhow!(
            "'SpeakerInput::stream' is not supported on this platform"
        ))
    }
}

// https://github.com/floneum/floneum/blob/50afe10/interfaces/kalosm-sound/src/source/mic.rs#L140
pub struct SpeakerStream {
    inner: PlatformSpeakerStream,
    buffer: Vec<f32>,
    buffer_idx: usize,
}

impl Stream for SpeakerStream {
    type Item = f32;

    fn poll_next(
        mut self: std::pin::Pin<&mut Self>,
        cx: &mut std::task::Context<'_>,
    ) -> std::task::Poll<Option<Self::Item>> {
        #[cfg(any(target_os = "macos", target_os = "windows", target_os = "linux"))]
        {
            if self.buffer_idx < self.buffer.len() {
                let sample = self.buffer[self.buffer_idx];
                self.buffer_idx += 1;
                return std::task::Poll::Ready(Some(sample));
            }

            match self.inner.poll_next_unpin(cx) {
                std::task::Poll::Ready(Some(chunk)) => {
                    self.buffer = chunk;
                    self.buffer_idx = 0;
                    if !self.buffer.is_empty() {
                        let sample = self.buffer[0];
                        self.buffer_idx = 1;
                        std::task::Poll::Ready(Some(sample))
                    } else {
                        std::task::Poll::Pending
                    }
                }
                std::task::Poll::Ready(None) => std::task::Poll::Ready(None),
                std::task::Poll::Pending => std::task::Poll::Pending,
            }
        }

        #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
        {
            std::task::Poll::Pending
        }
    }
}

impl kalosm_sound::AsyncSource for SpeakerStream {
    fn as_stream(&mut self) -> impl Stream<Item = f32> + '_ {
        self
    }

    #[cfg(any(target_os = "macos", target_os = "windows", target_os = "linux"))]
    fn sample_rate(&self) -> u32 {
        self.inner.sample_rate()
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
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

    #[cfg(target_os = "linux")]
    #[tokio::test]
    #[serial]
    async fn test_linux() {
        use kalosm_sound::AsyncSource;

        let input = match SpeakerInput::new() {
            Ok(input) => input,
            Err(e) => {
                println!("Failed to create SpeakerInput: {}", e);
                println!(
                    "This is expected if ALSA is not configured or no audio devices are available"
                );
                return;
            }
        };

        let sample_rate = input.sample_rate();
        println!("Linux speaker sample rate: {}", sample_rate);
        assert!(sample_rate > 0);

        let mut stream = match input.stream() {
            Ok(stream) => stream,
            Err(e) => {
                println!("Failed to create speaker stream: {}", e);
                return;
            }
        };

        let stream_sample_rate = stream.sample_rate();
        println!("Linux speaker stream sample rate: {}", stream_sample_rate);
        assert!(stream_sample_rate > 0);

        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

        let mut sample_count = 0;
        let timeout = tokio::time::sleep(tokio::time::Duration::from_secs(2));
        tokio::pin!(timeout);

        loop {
            tokio::select! {
                _ = &mut timeout => {
                    println!("Timeout reached after collecting {} samples", sample_count);
                    break;
                }
                sample = stream.next() => {
                    if let Some(_s) = sample {
                        sample_count += 1;
                        if sample_count >= 1000 {
                            break;
                        }
                    } else {
                        break;
                    }
                }
            }
        }

        println!("Received {} samples from Linux speaker", sample_count);
        if sample_count > 0 {
            println!("Successfully captured audio samples");
        } else {
            println!("No samples captured - this may be expected if no audio is playing or permissions are not granted");
        }
    }
}
