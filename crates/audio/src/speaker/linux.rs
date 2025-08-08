use futures_util::Stream;
use std::pin::Pin;
use std::sync::mpsc;
use std::task::{Context, Poll};
use std::thread;
use std::time::Duration;

pub struct SpeakerInput {}

impl SpeakerInput {
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
        // For now, we'll create a mock implementation that generates silence
        // A proper implementation would capture system audio using ALSA
        let (sender, receiver) = mpsc::channel::<f32>();

        // Spawn a thread to simulate audio capture
        let handle = thread::spawn(move || {
            tracing::debug!("Starting Linux SpeakerStream thread");
            loop {
                // Send silence (0.0) to simulate no audio
                // In a real implementation, this would capture actual system audio
                if sender.send(0.0).is_err() {
                    tracing::debug!("SpeakerStream channel closed, exiting thread");
                    break; // Channel closed
                }

                // Small delay to prevent busy looping
                thread::sleep(Duration::from_millis(10));
            }
        });

        Self {
            receiver,
            _handle: handle,
        }
    }

    pub fn sample_rate(&self) -> u32 {
        48000 // Standard sample rate
    }
}

impl Stream for SpeakerStream {
    type Item = f32;

    fn poll_next(
        self: Pin<&mut Self>,
        cx: &mut Context<'_>,
    ) -> Poll<Option<Self::Item>> {
        match self.receiver.try_recv() {
            Ok(sample) => Poll::Ready(Some(sample)),
            Err(mpsc::TryRecvError::Empty) => {
                // No data available right now, but we'll check again later
                cx.waker().wake_by_ref();
                Poll::Pending
            }
            Err(mpsc::TryRecvError::Disconnected) => Poll::Ready(None),
        }
    }
}

impl Drop for SpeakerStream {
    fn drop(&mut self) {
        // The thread will automatically exit when the sender is dropped
        // and the receiver gets a Disconnected error
        tracing::debug!("Dropping SpeakerStream");
    }
}
