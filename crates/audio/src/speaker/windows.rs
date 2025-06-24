use std::sync::{Arc, Mutex};
use std::task::{Poll, Waker};
use std::thread;
use std::time::Duration;
use std::collections::VecDeque;
use anyhow::Result;
use futures_util::Stream;
use ringbuf::traits::{Producer, Split};
use ringbuf::{HeapCons, HeapRb, traits::Consumer};
use tracing::debug;
use wasapi::{self, get_default_device, Direction, SampleType, ShareMode, WaveFormat, StreamMode };

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

            // Get the default render device for loopback capture
            let device = get_default_device(&Direction::Capture).expect("no device!!");
            
            let mut audio_client = match device.get_iaudioclient() {
                Ok(client) => client,
                Err(e) => {
                    eprintln!("Failed to get audio client: {e}");
                    return;
                }
            };
            
            // Get the device's mix format for loopback
            let desired_format = WaveFormat::new(32, 32, &SampleType::Float, 44100, 2, None);

            
            // why not get_device_period?
            let (def_time, min_time) = audio_client.get_device_period().unwrap();
            debug!("default period {}, min period {}", def_time, min_time);
        
            let mode = StreamMode::EventsShared {
                autoconvert: true,
                buffer_duration_hns: min_time,
            };
            audio_client.initialize_client(&desired_format, &Direction::Capture, &mode).unwrap();

            let capture_client = match audio_client.get_audiocaptureclient() {
                Ok(client) => client,
                Err(e) => {
                    eprintln!("Failed to get capture client: {e}");
                    return;
                }
            };
            
            if let Err(e) = audio_client.start_stream() {
                eprintln!("Failed to start stream: {e}");
                return;
            }
            
            let mut sample_queue: VecDeque<u8> = VecDeque::new();
            let blockalign = desired_format.get_blockalign();
            let chunksize = 1024; // frames per chunk
            
            loop {
                // Process queued samples
                while sample_queue.len() >= (blockalign as usize * chunksize) {
                    let mut chunk = vec![0u8; blockalign as usize * chunksize];
                    for element in chunk.iter_mut() {
                        *element = sample_queue.pop_front().unwrap();
                    }
                    
                    // Convert bytes to f32 samples
                    let f32_samples: Vec<f32> = chunk
                        .chunks_exact(4)
                        .map(|bytes| f32::from_le_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]))
                        .collect();
                    
                    let pushed = producer.push_slice(&f32_samples);
                    let mut state = waker_state2.lock().unwrap();
                    if pushed > 0 && !state.has_data {
                        state.has_data = true;
                        if let Some(waker) = state.waker.take() {
                            drop(state);
                            waker.wake();
                        }
                    }
                }
                
                // Capture new frames
                let new_frames = match capture_client.get_next_packet_size() {
                    Ok(Some(size)) => size,
                    Ok(None) => 0,
                    Err(_) => {
                        thread::sleep(Duration::from_millis(10));
                        continue;
                    }
                };
                
                if new_frames > 0 {
                    let additional = (new_frames as usize * blockalign as usize)
                        .saturating_sub(sample_queue.capacity() - sample_queue.len());
                    sample_queue.reserve(additional);
                    
                    if let Err(_) = capture_client.read_from_device_to_deque(&mut sample_queue) {
                        thread::sleep(Duration::from_millis(10));
                        continue;
                    }
                } else {
                    thread::sleep(Duration::from_millis(10));
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