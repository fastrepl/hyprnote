use std::{
    collections::VecDeque,
    pin::Pin,
    sync::{Arc, Mutex},
    task::{Context, Poll, RawWaker, RawWakerVTable, Waker},
};

use futures_util::Stream;
use kalosm_sound::AsyncSource;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DrainState {
    pub processed: bool,
    pub terminated: bool,
}

pub fn drain_stream<S, F, E>(mut stream: Pin<&mut S>, mut on_item: F) -> Result<DrainState, E>
where
    S: Stream,
    F: FnMut(S::Item) -> Result<(), E>,
{
    let waker = noop_waker();
    let mut ctx = Context::from_waker(&waker);
    let mut processed = false;

    loop {
        match stream.as_mut().poll_next(&mut ctx) {
            Poll::Ready(Some(item)) => {
                on_item(item)?;
                processed = true;
            }
            Poll::Ready(None) => {
                return Ok(DrainState {
                    processed,
                    terminated: true,
                })
            }
            Poll::Pending => {
                return Ok(DrainState {
                    processed,
                    terminated: false,
                })
            }
        }
    }
}

pub fn poll_next_now<S>(mut stream: Pin<&mut S>) -> Poll<Option<S::Item>>
where
    S: Stream,
{
    let waker = noop_waker();
    let mut ctx = Context::from_waker(&waker);
    stream.as_mut().poll_next(&mut ctx)
}

/// Push-driven audio source implementing [`AsyncSource`].
#[derive(Debug)]
pub struct PushSource {
    shared: Arc<Mutex<Shared>>,
}

/// Handle for feeding data into [`PushSource`].
#[derive(Debug, Clone)]
pub struct PushSourceHandle {
    shared: Arc<Mutex<Shared>>,
}

#[derive(Debug, Default)]
struct Shared {
    queue: VecDeque<Chunk>,
    current: Option<Chunk>,
    index: usize,
    sample_rate: u32,
    closed: bool,
}

#[derive(Debug)]
struct Chunk {
    samples: Vec<f32>,
    sample_rate: u32,
}

impl PushSource {
    /// Create a new push source with an initial sample rate.
    pub fn new(initial_sample_rate: u32) -> (Self, PushSourceHandle) {
        let shared = Arc::new(Mutex::new(Shared {
            sample_rate: initial_sample_rate,
            ..Default::default()
        }));

        (
            Self {
                shared: shared.clone(),
            },
            PushSourceHandle { shared },
        )
    }
}

impl PushSourceHandle {
    /// Queue a chunk of samples produced at the provided sample rate.
    pub fn push(&self, samples: Vec<f32>, sample_rate: u32) {
        if samples.is_empty() || sample_rate == 0 {
            return;
        }

        let mut shared = self.shared.lock().unwrap();
        shared.queue.push_back(Chunk {
            samples,
            sample_rate,
        });
    }

    /// Signal that no additional data will arrive.
    pub fn close(&self) {
        let mut shared = self.shared.lock().unwrap();
        shared.closed = true;
    }
}

struct PushSourceStream<'a> {
    source: &'a mut PushSource,
}

impl<'a> Stream for PushSourceStream<'a> {
    type Item = f32;

    fn poll_next(
        self: std::pin::Pin<&mut Self>,
        _cx: &mut Context<'_>,
    ) -> Poll<Option<Self::Item>> {
        let mut shared = self.source.shared.lock().unwrap();

        loop {
            if let Some(len) = shared.current.as_ref().map(|chunk| chunk.samples.len()) {
                if shared.index < len {
                    let sample = shared.current.as_ref().unwrap().samples[shared.index];
                    shared.index += 1;

                    if shared.index == len {
                        shared.current = None;
                        shared.index = 0;
                    }

                    return Poll::Ready(Some(sample));
                }

                shared.current = None;
                shared.index = 0;
                continue;
            }

            if let Some(next) = shared.queue.pop_front() {
                shared.sample_rate = next.sample_rate;

                if next.samples.is_empty() {
                    continue;
                }

                shared.current = Some(next);
                shared.index = 0;
                continue;
            }

            return if shared.closed {
                Poll::Ready(None)
            } else {
                Poll::Pending
            };
        }
    }
}

impl AsyncSource for PushSource {
    fn as_stream(&mut self) -> impl Stream<Item = f32> + '_ {
        PushSourceStream { source: self }
    }

    fn sample_rate(&self) -> u32 {
        let shared = self.shared.lock().unwrap();

        if let Some(current) = shared.current.as_ref() {
            current.sample_rate
        } else if let Some(next) = shared.queue.front() {
            next.sample_rate
        } else {
            shared.sample_rate
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::pin::Pin;
    use std::task::Poll;

    #[test]
    fn streams_pushed_samples() {
        let (mut source, handle) = PushSource::new(16_000);
        handle.push(vec![0.0, 1.0], 16_000);
        handle.push(vec![2.0, 3.0], 16_000);
        handle.close();

        let mut stream = source.as_stream();
        let mut collected = Vec::new();
        let state = drain_stream(Pin::new(&mut stream), |sample| {
            collected.push(sample);
            Ok::<_, ()>(())
        })
        .unwrap();

        assert!(state.processed);
        assert!(state.terminated);
        assert_eq!(collected, vec![0.0, 1.0, 2.0, 3.0]);
    }

    #[test]
    fn updates_sample_rate_from_chunks() {
        let (mut source, handle) = PushSource::new(8_000);
        assert_eq!(source.sample_rate(), 8_000);

        handle.push(vec![0.0], 12_000);
        assert_eq!(source.sample_rate(), 12_000);

        handle.push(vec![1.0, 2.0], 24_000);
        handle.close();

        {
            let mut stream = source.as_stream();
            assert_eq!(poll_next_now(Pin::new(&mut stream)), Poll::Ready(Some(0.0)));
        }
        assert_eq!(source.sample_rate(), 24_000);
        {
            let mut stream = source.as_stream();
            assert_eq!(poll_next_now(Pin::new(&mut stream)), Poll::Ready(Some(1.0)));
        }
        {
            let mut stream = source.as_stream();
            assert_eq!(poll_next_now(Pin::new(&mut stream)), Poll::Ready(Some(2.0)));
        }
        {
            let mut stream = source.as_stream();
            assert_eq!(poll_next_now(Pin::new(&mut stream)), Poll::Ready(None));
        }
        assert_eq!(source.sample_rate(), 24_000);
    }

    #[test]
    fn pending_until_closed() {
        let (mut source, handle) = PushSource::new(16_000);

        {
            let mut stream = source.as_stream();
            assert_eq!(poll_next_now(Pin::new(&mut stream)), Poll::Pending);
        }

        handle.close();

        {
            let mut stream = source.as_stream();
            assert_eq!(poll_next_now(Pin::new(&mut stream)), Poll::Ready(None));
        }
    }
}

fn noop_waker() -> Waker {
    unsafe fn clone(_: *const ()) -> RawWaker {
        RawWaker::new(std::ptr::null(), &VTABLE)
    }

    unsafe fn wake(_: *const ()) {}

    static VTABLE: RawWakerVTable = RawWakerVTable::new(clone, wake, wake, wake);

    unsafe { Waker::from_raw(RawWaker::new(std::ptr::null(), &VTABLE)) }
}
