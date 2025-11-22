use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::{Arc, Mutex};
use std::task::{Poll, Waker};
use std::thread;

use anyhow::{Context, Result};
use futures_util::Stream;
use ringbuf::{
    traits::{Consumer, Producer, Split},
    HeapCons, HeapProd, HeapRb,
};

pub struct SpeakerInput {
    sample_rate: u32,
    device_name: String,
}

struct WakerState {
    waker: Option<Waker>,
    has_data: bool,
}

pub struct SpeakerStream {
    consumer: HeapCons<f32>,
    waker_state: Arc<Mutex<WakerState>>,
    current_sample_rate: Arc<AtomicU32>,
    read_buffer: Vec<f32>,
    _stop_signal: Arc<AtomicBool>,
    _capture_thread: Option<thread::JoinHandle<()>>,
}

const CHUNK_SIZE: usize = 256;
const BUFFER_SIZE: usize = CHUNK_SIZE * 4;

impl SpeakerInput {
    pub fn new() -> Result<Self> {
        let device_name = Self::find_monitor_device()?;
        let sample_rate = Self::detect_sample_rate(&device_name)?;

        Ok(Self {
            sample_rate,
            device_name,
        })
    }

    fn find_monitor_device() -> Result<String> {
        Ok("default".to_string())
    }

    fn detect_sample_rate(device_name: &str) -> Result<u32> {
        use alsa::pcm::{HwParams, PCM};
        use alsa::Direction;

        let pcm = PCM::new(device_name, Direction::Capture, false)
            .context("Failed to open PCM device")?;

        let hwp = HwParams::any(&pcm).context("Failed to get hardware parameters")?;

        let sample_rate = hwp.get_rate().unwrap_or(48000);

        Ok(sample_rate)
    }

    pub fn sample_rate(&self) -> u32 {
        self.sample_rate
    }

    pub fn stream(self) -> SpeakerStream {
        let rb = HeapRb::<f32>::new(BUFFER_SIZE);
        let (producer, consumer) = rb.split();

        let waker_state = Arc::new(Mutex::new(WakerState {
            waker: None,
            has_data: false,
        }));

        let current_sample_rate = Arc::new(AtomicU32::new(self.sample_rate));
        let stop_signal = Arc::new(AtomicBool::new(false));

        let capture_thread = {
            let device_name = self.device_name.clone();
            let waker_state = waker_state.clone();
            let current_sample_rate = current_sample_rate.clone();
            let stop_signal = stop_signal.clone();

            thread::spawn(move || {
                if let Err(e) = Self::capture_loop(
                    &device_name,
                    producer,
                    waker_state,
                    current_sample_rate,
                    stop_signal,
                ) {
                    tracing::error!(error = ?e, "Audio capture thread failed");
                }
            })
        };

        SpeakerStream {
            consumer,
            waker_state,
            current_sample_rate,
            read_buffer: vec![0.0f32; CHUNK_SIZE],
            _stop_signal: stop_signal,
            _capture_thread: Some(capture_thread),
        }
    }

    fn capture_loop(
        device_name: &str,
        mut producer: HeapProd<f32>,
        waker_state: Arc<Mutex<WakerState>>,
        current_sample_rate: Arc<AtomicU32>,
        stop_signal: Arc<AtomicBool>,
    ) -> Result<()> {
        use alsa::pcm::{Access, Format, HwParams, PCM};
        use alsa::{Direction, ValueOr};

        let pcm = PCM::new(device_name, Direction::Capture, false)
            .context("Failed to open PCM device for capture")?;

        let hwp = HwParams::any(&pcm).context("Failed to get hardware parameters")?;

        hwp.set_channels(1).context("Failed to set channels")?;
        hwp.set_rate(48000, ValueOr::Nearest)
            .context("Failed to set sample rate")?;
        hwp.set_format(Format::float())
            .context("Failed to set format")?;
        hwp.set_access(Access::RWInterleaved)
            .context("Failed to set access")?;

        pcm.hw_params(&hwp)
            .context("Failed to apply hardware parameters")?;

        let sample_rate = hwp.get_rate().unwrap_or(48000);

        current_sample_rate.store(sample_rate, Ordering::Release);
        tracing::info!(sample_rate = sample_rate, "ALSA capture initialized");

        let io = pcm.io_f32().context("Failed to get I/O interface")?;
        let mut buffer = vec![0.0f32; CHUNK_SIZE];

        while !stop_signal.load(Ordering::Acquire) {
            match io.readi(&mut buffer) {
                Ok(frames_read) => {
                    if frames_read > 0 {
                        let data = &buffer[..frames_read];
                        let pushed = producer.push_slice(data);

                        if pushed < data.len() {
                            let dropped = data.len() - pushed;
                            tracing::warn!(dropped, "samples_dropped");
                        }

                        if pushed > 0 {
                            let should_wake = {
                                let mut state = waker_state.lock().unwrap();
                                if !state.has_data {
                                    state.has_data = true;
                                    state.waker.take()
                                } else {
                                    None
                                }
                            };

                            if let Some(waker) = should_wake {
                                waker.wake();
                            }
                        }
                    }
                }
                Err(e) => {
                    tracing::error!(error = ?e, "Failed to read from PCM device");
                    if let Err(recover_err) = pcm.try_recover(e, false) {
                        tracing::error!(error = ?recover_err, "Failed to recover PCM device");
                        break;
                    }
                }
            }
        }

        Ok(())
    }
}

impl SpeakerStream {
    pub fn sample_rate(&self) -> u32 {
        self.current_sample_rate.load(Ordering::Acquire)
    }
}

impl Stream for SpeakerStream {
    type Item = Vec<f32>;

    fn poll_next(
        mut self: std::pin::Pin<&mut Self>,
        cx: &mut std::task::Context<'_>,
    ) -> Poll<Option<Self::Item>> {
        let this = self.as_mut().get_mut();
        let popped = this.consumer.pop_slice(&mut this.read_buffer);

        if popped > 0 {
            return Poll::Ready(Some(this.read_buffer[..popped].to_vec()));
        }

        {
            let mut state = this.waker_state.lock().unwrap();
            state.has_data = false;
            state.waker = Some(cx.waker().clone());
        }

        Poll::Pending
    }
}

impl Drop for SpeakerStream {
    fn drop(&mut self) {
        self._stop_signal.store(true, Ordering::Release);
        if let Ok(mut state) = self.waker_state.lock() {
            if let Some(waker) = state.waker.take() {
                waker.wake();
            }
        }
    }
}
