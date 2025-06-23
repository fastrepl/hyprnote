use std::sync::{Arc, Mutex};
use std::task::{Poll, Waker};
use std::thread;
use std::time::Duration;
use anyhow::Result;
use futures_util::Stream;
use ringbuf::traits::Split;
use ringbuf::{HeapCons, HeapRb, traits::Consumer};
use wasapi::{self, Direction};

pub struct SpeakerInput {
    sample_rate_override: Option<u32>,
}

struct WakerState {
    waker: Option<Waker>,
    has_data: bool,
}

pub struct SpeakerStream {
    consumer: HeapCons<f32>,
    sample_rate: u32,
    _thread: Option<thread::JoinHandle<()>>,
    waker_state: Arc<Mutex<WakerState>>,
}

impl SpeakerInput {
    pub fn new(sample_rate_override: Option<u32>) -> Result<Self> {
        Ok(Self { sample_rate_override })
    }

    pub fn stream(self) -> Result<SpeakerStream> {
        let sample_rate = self.sample_rate_override.unwrap_or(48000);
        let rb = HeapRb::<f32>::new(8192);
        let (mut producer, consumer) = rb.split();
        let waker_state = Arc::new(Mutex::new(WakerState { waker: None, has_data: false }));

        let waker_state2 = waker_state.clone();
        let handle = thread::spawn(move || {
            if wasapi::initialize_mta().is_err() {
                eprintln!("WASAPI init error");
                return;
            }
            let device = match wasapi::get_default_device(&Direction::Render) {
                Ok(d) => d,
                Err(e) => {
                    eprintln!("WASAPI device error: {e}");
                    return;
                }
            };
            let mut stream = match device.build_loopback_stream::<f32>() {
                Ok(s) => s,
                Err(e) => {
                    eprintln!("WASAPI stream error: {e}");
                    return;
                }
            };
            loop {
                match stream.read() {
                    Ok(buf) => {
                        let samples = buf.to_vec();
                        let pushed = producer.push_slice(&samples);
                        let mut state = waker_state2.lock().unwrap();
                        if pushed > 0 && !state.has_data {
                            state.has_data = true;
                            if let Some(waker) = state.waker.take() {
                                drop(state);
                                waker.wake();
                            }
                        }
                    }
                    Err(_) => {
                        thread::sleep(Duration::from_millis(10));
                    }
                }
            }
        });

        Ok(SpeakerStream {
            consumer,
            sample_rate,
            _thread: Some(handle),
            waker_state,
        })
    }
}

impl SpeakerStream {
    pub fn sample_rate(&self) -> u32 {
        self.sample_rate
    }
}

impl Stream for SpeakerStream {
    type Item = f32;

    fn poll_next(
        mut self: std::pin::Pin<&mut Self>,
        cx: &mut std::task::Context<'_>,
    ) -> std::task::Poll<Option<Self::Item>> {
        if let Some(sample) = self.consumer.try_pop() {
            return Poll::Ready(Some(sample));
        }
        {
            let mut state = self.waker_state.lock().unwrap();
            state.has_data = false;
            state.waker = Some(cx.waker().clone());
            drop(state);
        }
        match self.consumer.try_pop() {
            Some(sample) => Poll::Ready(Some(sample)),
            None => Poll::Pending,
        }
    }
}
