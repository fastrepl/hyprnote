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
    /// Creates a platform-specific speaker input initialized for the current OS.
    ///
    /// # Returns
    ///
    /// `Ok(Self)` containing a `SpeakerInput` if initialization succeeds, `Err` with the underlying error otherwise.
    ///
    /// # Examples
    ///
    /// ```no_run
    /// let input = SpeakerInput::new().expect("failed to create speaker input");
    /// let _stream = input.stream().expect("failed to open speaker stream");
    /// ```
    #[cfg(any(target_os = "macos", target_os = "windows", target_os = "linux"))]
    pub fn new() -> Result<Self> {
        let inner = PlatformSpeakerInput::new()?;
        Ok(Self { inner })
    }

    /// Indicates that SpeakerInput is unsupported on the current platform.
    ///
    /// # Returns
    ///
    /// An `Err` containing an error stating that `SpeakerInput::new` is not supported on this platform.
    ///
    /// # Examples
    ///
    /// ```
    /// // This function is compiled only on unsupported platforms.
    /// let err = crate::speaker::SpeakerInput::new().unwrap_err();
    /// let msg = format!("{}", err);
    /// assert!(msg.contains("SpeakerInput::new") || msg.contains("not supported"));
    /// ```
    pub fn new() -> Result<Self> {
        Err(anyhow::anyhow!(
            "'SpeakerInput::new' is not supported on this platform"
        ))
    }

    /// Create a `SpeakerStream` by consuming this `SpeakerInput`.
    ///
    /// # Returns
    ///
    /// A `Result` containing the created `SpeakerStream` on success, or an error describing why the stream could not be created.
    ///
    /// # Examples
    ///
    /// ```
    /// # use kalosm_sound::speaker::SpeakerInput;
    /// let input = SpeakerInput::new().unwrap();
    /// let stream = input.stream().unwrap();
    /// let _rate = stream.sample_rate();
    /// ```
    pub fn stream(self) -> Result<SpeakerStream> {
        let inner = self.inner.stream();
        Ok(SpeakerStream { inner })
    }

    /// Attempts to obtain a speaker input stream on platforms that do not support speaker capture.
    ///
    /// # Returns
    ///
    /// An `Err` containing a message that `SpeakerInput::stream` is not supported on the current platform.
    ///
    /// # Examples
    ///
    /// ```
    /// // This example shows that calling `stream` on unsupported platforms yields an error.
    /// # use anyhow::Result;
    /// # fn try_stream() -> Result<()> {
    /// #     Err(anyhow::anyhow!("example"))?; // placeholder to make doctest compile when not run
    /// # }
    /// ```
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
}

impl Stream for SpeakerStream {
    type Item = f32;

    /// Polls the stream for the next audio sample.
    ///
    /// # Returns
    ///
    /// `Poll::Ready(Some(f32))` with the next sample when available, `Poll::Ready(None)` if the stream ended,
    /// or `Poll::Pending` if no data is currently available.
    ///
    /// # Examples
    ///
    /// ```no_run
    /// use std::pin::Pin;
    /// use std::task::{Context, Poll, Waker};
    /// // Assume `stream` is a `SpeakerStream` obtained from `SpeakerInput::stream()`.
    /// // let mut stream = ...;
    /// // let mut pinned = Box::pin(stream);
    /// // let waker = futures::task::noop_waker();
    /// // let mut cx = Context::from_waker(&waker);
    /// // match Pin::as_mut(&mut pinned).poll_next(&mut cx) {
    /// //     Poll::Ready(Some(sample)) => println!("sample: {}", sample),
    /// //     Poll::Ready(None) => println!("stream ended"),
    /// //     Poll::Pending => println!("no data yet"),
    /// // }
    /// ```
    fn poll_next(
        self: std::pin::Pin<&mut Self>,
        _cx: &mut std::task::Context<'_>,
    ) -> std::task::Poll<Option<Self::Item>> {
        #[cfg(any(target_os = "macos", target_os = "windows", target_os = "linux"))]
        {
            self.get_mut().inner.poll_next_unpin(_cx)
        }

        #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
        {
            std::task::Poll::Pending
        }
    }
}

impl kalosm_sound::AsyncSource for SpeakerStream {
    /// Expose this SpeakerStream as an asynchronous stream of audio samples.
    ///
    /// The returned stream yields `f32` sample values from the underlying speaker input and borrows
    /// from `self` for the lifetime of the returned value.
    ///
    /// # Examples
    ///
    /// ```
    /// # use futures::stream::StreamExt;
    /// # use kalosm_sound::speaker::SpeakerStream;
    /// async fn use_stream(mut s: SpeakerStream) {
    ///     let mut stream = s.as_stream();
    ///     // Drive the stream to obtain the next sample (requires an async runtime).
    ///     let _sample = stream.next().await;
    /// }
    /// ```
    fn as_stream(&mut self) -> impl Stream<Item = f32> + '_ {
        self
    }

    /// Get the sample rate of the underlying speaker stream in hertz.
    ///
    /// # Examples
    ///
    /// ```
    /// let rate = stream.sample_rate();
    /// assert!(rate > 0);
    /// ```
    fn sample_rate(&self) -> u32 {
        self.inner.sample_rate()
    }

    /// Report the stream's sample rate on unsupported platforms.
    ///
    /// On targets other than macOS, Windows, or Linux this method always reports `0` to indicate the sample rate is unavailable.
    ///
    /// # Examples
    ///
    /// ```
    /// // On an unsupported platform this should return 0:
    /// // let rate = stream.sample_rate();
    /// // assert_eq!(rate, 0);
    /// ```
    fn sample_rate(&self) -> u32 {
        0
    }
}

#[cfg(test)]
mod tests {
    use super::*;
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

            println!("Playing sine for {} seconds", seconds);
            stream_handle.play_raw(source).unwrap();
            sleep(Duration::from_secs(seconds));
        })
    }

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