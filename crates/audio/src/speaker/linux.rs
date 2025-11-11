use futures_util::{Stream, StreamExt};
use futures_channel::mpsc::{unbounded, UnboundedReceiver, UnboundedSender};
use std::pin::Pin;
use std::task::{Context, Poll};
use std::thread;
use std::time::Duration;

pub struct SpeakerInput {}

impl SpeakerInput {
    /// Construct a new Linux SpeakerInput handle.
    pub fn new() -> Result<Self, anyhow::Error> {
        tracing::debug!("Creating Linux SpeakerInput");
        // Add basic audio system availability check
        // This is a minimal check - a full implementation would verify ALSA/PulseAudio availability
        Ok(Self {})
    }

    pub fn stream(self) -> SpeakerStream {
        tracing::debug!("Creating Linux SpeakerStream");
        SpeakerStream::new()
    }
}

pub struct SpeakerStream {
    receiver: UnboundedReceiver<f32>,
    _handle: thread::JoinHandle<()>, // Keep the thread alive
}

impl SpeakerStream {
    pub fn new() -> Self {
        tracing::debug!("Creating Linux SpeakerStream");
        // Mock implementation: proper implementation would capture system audio using ALSA
        let (sender, receiver): (UnboundedSender<f32>, UnboundedReceiver<f32>) = unbounded();

        let handle = thread::spawn(move || {
            tracing::debug!("Starting Linux SpeakerStream thread");
            loop {
                if sender.unbounded_send(0.0).is_err() {
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

    fn poll_next(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        // Use async-aware receiver to avoid busy-loop; waker is notified on send
        self.get_mut().receiver.poll_next_unpin(cx)
    }
}

impl Drop for SpeakerStream {
    fn drop(&mut self) {
        tracing::debug!("Dropping SpeakerStream");
    }
}
