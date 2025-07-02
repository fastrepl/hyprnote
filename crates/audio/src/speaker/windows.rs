use anyhow::Result;
use futures_util::Stream;
use std::collections::VecDeque;
use std::sync::{Arc, Mutex};
use std::task::{Poll, Waker};
use std::thread;
use tracing::error;
use wasapi::{get_default_device, Direction, SampleType, StreamMode, WaveFormat};

pub struct SpeakerInput {
    _sample_rate_override: Option<u32>,
}

impl SpeakerInput {
    pub fn new(_sample_rate_override: Option<u32>) -> Result<Self> {
        Ok(Self {
            _sample_rate_override,
        })
    }

    pub fn stream(self) -> SpeakerStream {
        let sample_queue = Arc::new(Mutex::new(VecDeque::new()));
        let waker_state = Arc::new(Mutex::new(WakerState {
            waker: None,
            has_data: false,
        }));

        let queue_clone = sample_queue.clone();
        let waker_clone = waker_state.clone();

        let capture_thread = thread::spawn(move || {
            if let Err(e) = SpeakerStream::capture_audio_loop(queue_clone, waker_clone) {
                error!("Audio capture loop failed: {}", e);
            }
        });

        SpeakerStream {
            sample_queue,
            waker_state,
            _capture_thread: capture_thread,
        }
    }
}

struct WakerState {
    waker: Option<Waker>,
    has_data: bool,
}

pub struct SpeakerStream {
    sample_queue: Arc<Mutex<VecDeque<f32>>>,
    waker_state: Arc<Mutex<WakerState>>,
    _capture_thread: thread::JoinHandle<()>,
}

unsafe impl Send for SpeakerStream {}

impl SpeakerStream {
    pub fn sample_rate(&self) -> u32 {
        44100
    }

    fn capture_audio_loop(
        sample_queue: Arc<Mutex<VecDeque<f32>>>,
        waker_state: Arc<Mutex<WakerState>>,
    ) -> Result<()> {
        let device = get_default_device(&Direction::Render)?;
        let mut audio_client = device.get_iaudioclient()?;

        let desired_format = WaveFormat::new(32, 32, &SampleType::Float, 44100, 1, None);

        let (_def_time, min_time) = audio_client.get_device_period()?;

        let mode = StreamMode::EventsShared {
            autoconvert: true,
            buffer_duration_hns: min_time,
        };

        audio_client.initialize_client(&desired_format, &Direction::Capture, &mode)?;

        let h_event = audio_client.set_get_eventhandle()?;
        let render_client = audio_client.get_audiocaptureclient()?;

        audio_client.start_stream()?;

        loop {
            if h_event.wait_for_event(3000).is_err() {
                error!("timeout error, stopping capture");
                break;
            }

            let mut temp_queue = VecDeque::new();
            if let Err(e) = render_client.read_from_device_to_deque(&mut temp_queue) {
                error!("Failed to read audio data: {}", e);
                continue;
            }

            if temp_queue.is_empty() {
                continue;
            }

            let mut samples = Vec::new();
            while temp_queue.len() >= 4 {
                let bytes = [
                    temp_queue.pop_front().unwrap(),
                    temp_queue.pop_front().unwrap(),
                    temp_queue.pop_front().unwrap(),
                    temp_queue.pop_front().unwrap(),
                ];
                let sample = f32::from_le_bytes(bytes);
                samples.push(sample);
            }

            if !samples.is_empty() {
                {
                    let mut queue = sample_queue.lock().unwrap();
                    queue.extend(samples);

                    let len = queue.len();
                    if len > 8192 {
                        queue.drain(0..(len - 8192));
                    }
                }

                {
                    let mut state = waker_state.lock().unwrap();
                    if !state.has_data {
                        state.has_data = true;
                        if let Some(waker) = state.waker.take() {
                            drop(state);
                            waker.wake();
                        }
                    }
                }
            }
        }

        Ok(())
    }
}

impl Stream for SpeakerStream {
    type Item = f32;
    fn poll_next(
        self: std::pin::Pin<&mut Self>,
        cx: &mut std::task::Context<'_>,
    ) -> Poll<Option<Self::Item>> {
        {
            let mut queue = self.sample_queue.lock().unwrap();
            if let Some(sample) = queue.pop_front() {
                return Poll::Ready(Some(sample));
            }
        }

        {
            let mut state = self.waker_state.lock().unwrap();
            state.has_data = false;
            state.waker = Some(cx.waker().clone());
        }

        {
            let mut queue = self.sample_queue.lock().unwrap();
            match queue.pop_front() {
                Some(sample) => Poll::Ready(Some(sample)),
                None => Poll::Pending,
            }
        }
    }
}
