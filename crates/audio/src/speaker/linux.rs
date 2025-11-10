use futures_util::Stream;
use std::pin::Pin;
use std::sync::mpsc;
use std::task::{Context, Poll};
use std::thread;
use std::time::Duration;

pub struct SpeakerInput {}

impl SpeakerInput {
    /// Construct a new Linux SpeakerInput handle.
    ///
    /// Returns `Ok(Self)` on success, or an `anyhow::Error` if creation fails.
    ///
    /// # Examples
    ///
    /// ```rust
    /// use audio::SpeakerInput;
    /// let input = SpeakerInput::new().unwrap();
    /// ```
    pub fn new() -> Result<Self, anyhow::Error> {
        tracing::debug!("Creating Linux SpeakerInput");
        Ok(Self {})
    }

    pub fn stream(self) -> SpeakerStream {
        tracing::debug!("Creating Linux SpeakerStream");
        SpeakerStream::new()
    }
}

pub struct SpeakerStream {
    receiver: mpsc::Receiver<f32>,
    _handle: thread::JoinHandle<()>, // Keep the thread alive
}

impl SpeakerStream {
    pub fn new() -> Self {
        tracing::debug!("Creating Linux SpeakerStream");
        // Mock implementation: proper implementation would capture system audio using ALSA
        let (sender, receiver) = mpsc::channel::<f32>();

        let handle = thread::spawn(move || {
            tracing::debug!("Starting Linux SpeakerStream thread");
            loop {
                if sender.send(0.0).is_err() {
                    tracing::debug!("SpeakerStream channel closed, exiting thread");
                    break;
                }

                thread::sleep(Duration::from_millis(10));
            }
        });

        Self {
            receiver,
            _handle: handle,
        }
    }

    pub fn sample_rate(&self) -> u32 {
        48000
    }
}

impl Stream for SpeakerStream {
    type Item = f32;

    fn poll_next(self: Pin<&mut Self>, _cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        match self.receiver.try_recv() {
            Ok(sample) => Poll::Ready(Some(sample)),
            Err(mpsc::TryRecvError::Empty) => Poll::Pending,
            Err(mpsc::TryRecvError::Disconnected) => Poll::Ready(None),
        }
    }
}

impl Drop for SpeakerStream {
    fn drop(&mut self) {
        tracing::debug!("Dropping SpeakerStream");
    }
}
