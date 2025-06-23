use std::collections::VecDeque;
use std::sync::{Arc, Mutex};
use std::task::{Poll, Waker};
use std::thread;

use anyhow::Result;
use futures_util::Stream;
use ringbuf::{
    traits::{Consumer, Producer, Split},
    HeapCons, HeapProd, HeapRb,
};
use wasapi::*;

// Windows Speaker Capture Implementation using WASAPI Loopback Mode
// 
// This captures the system's default audio output (speakers/headphones) using
// WASAPI's loopback functionality, similar to "What U Hear" or "Stereo Mix"

struct WakerState {
    waker: Option<Waker>,
    has_data: bool,
}

pub struct SpeakerInput {
    sample_rate: u32,
    sample_rate_override: Option<u32>,
}

pub struct SpeakerStream {
    consumer: HeapCons<f32>,
    sample_rate: u32,
    sample_rate_override: Option<u32>,
    waker_state: Arc<Mutex<WakerState>>,
    _capture_thread: thread::JoinHandle<()>,
}

impl SpeakerInput {
    pub fn new(sample_rate_override: Option<u32>) -> Result<Self> {
        // Initialize COM for WASAPI
        let hr = initialize_mta();
        if hr.is_err() {
            return Err(anyhow::anyhow!("Failed to initialize WASAPI COM: {:?}", hr));
        }
        
        // Get the default render device
        let device = get_default_device(&Direction::Render)
            .map_err(|e| anyhow::anyhow!("Failed to get default render device: {:?}", e))?;
        
        let mut audio_client = device.get_iaudioclient()
            .map_err(|e| anyhow::anyhow!("Failed to get audio client: {:?}", e))?;
        
        let mix_format = audio_client.get_mixformat()
            .map_err(|e| anyhow::anyhow!("Failed to get mix format: {:?}", e))?;
        
        let sample_rate = mix_format.get_samplespersec();
        
        tracing::info!(
            device_sample_rate = sample_rate,
            channels = mix_format.get_nchannels(),
            bits_per_sample = mix_format.get_bitspersample(),
            override_sample_rate = sample_rate_override,
            "windows_speaker_input_initialized"
        );

        Ok(Self {
            sample_rate,
            sample_rate_override,
        })
    }

    pub fn stream(self) -> Result<SpeakerStream> {
        let rb = HeapRb::<f32>::new(8192);
        let (producer, consumer) = rb.split();
        
        let waker_state = Arc::new(Mutex::new(WakerState {
            waker: None,
            has_data: false,
        }));
        
        let waker_state_capture = waker_state.clone();
        let sample_rate = self.sample_rate;
        let sample_rate_override = self.sample_rate_override;
        
        let capture_thread = thread::spawn(move || {
            if let Err(e) = Self::capture_loop(producer, waker_state_capture) {
                tracing::error!("Windows speaker capture error: {}", e);
            }
        });
        
        Ok(SpeakerStream {
            consumer,
            sample_rate,
            sample_rate_override,
            waker_state,
            _capture_thread: capture_thread,
        })
    }
    
    fn capture_loop(
        mut producer: HeapProd<f32>,
        waker_state: Arc<Mutex<WakerState>>,
    ) -> Result<()> {
        let hr = initialize_mta();
        if hr.is_err() {
            return Err(anyhow::anyhow!("Failed to initialize COM: {:?}", hr));
        }
        
        let device = get_default_device(&Direction::Render)
            .map_err(|e| anyhow::anyhow!("Failed to get default render device: {:?}", e))?;
        
        let mut audio_client = device.get_iaudioclient()
            .map_err(|e| anyhow::anyhow!("Failed to get audio client: {:?}", e))?;
        
        let wave_format = audio_client.get_mixformat()
            .map_err(|e| anyhow::anyhow!("Failed to get mix format: {:?}", e))?;
        
        let channels = wave_format.get_nchannels() as usize;
        let bits_per_sample = wave_format.get_bitspersample();
        let bytes_per_sample = bits_per_sample / 8;
        let block_align = wave_format.get_blockalign() as usize;
        
        let mode = StreamMode::EventsShared {
            autoconvert: true,
            buffer_duration_hns: 100_000,
        };
        
        audio_client.initialize_client(&wave_format, &Direction::Capture, &mode)
            .map_err(|e| anyhow::anyhow!("Failed to initialize audio client: {:?}", e))?;
        
        let h_event = audio_client.set_get_eventhandle()
            .map_err(|e| anyhow::anyhow!("Failed to get event handle: {:?}", e))?;
        
        let capture_client = audio_client.get_audiocaptureclient()
            .map_err(|e| anyhow::anyhow!("Failed to get capture client: {:?}", e))?;
        
        let mut sample_queue: VecDeque<u8> = VecDeque::new();
        
        audio_client.start_stream()
            .map_err(|e| anyhow::anyhow!("Failed to start audio stream: {:?}", e))?;
        
        tracing::info!("Windows speaker capture started");
        
        loop {
            if h_event.wait_for_event(3000).is_err() {
                continue;
            }
            
            let frames_available = match capture_client.get_next_packet_size() {
                Ok(Some(frames)) => frames,
                Ok(None) => 0,
                Err(_) => continue,
            };
            
            if frames_available == 0 {
                continue;
            }
            
            let bytes_needed = frames_available as usize * block_align;
            sample_queue.reserve(bytes_needed.saturating_sub(sample_queue.capacity() - sample_queue.len()));
            
            if capture_client.read_from_device_to_deque(&mut sample_queue).is_err() {
                continue;
            }
            
            while sample_queue.len() >= block_align {
                let frame_bytes: Vec<u8> = (0..block_align)
                    .map(|_| sample_queue.pop_front().unwrap())
                    .collect();
                
                if let Ok(samples) = Self::convert_frame_to_f32(&frame_bytes, channels, bytes_per_sample as usize) {
                    let pushed = producer.push_slice(&samples);
                    
                    if pushed > 0 {
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
        }
    }
    
    fn convert_frame_to_f32(
        frame_bytes: &[u8],
        channels: usize,
        bytes_per_sample: usize,
    ) -> Result<Vec<f32>> {
        let mut samples = Vec::new();
        
        match bytes_per_sample {
            2 => {
                let sample_data: Vec<i16> = frame_bytes
                    .chunks_exact(2)
                    .map(|chunk| i16::from_le_bytes([chunk[0], chunk[1]]))
                    .collect();
                
                for chunk in sample_data.chunks(channels) {
                    let sum: i64 = chunk.iter().map(|&x| x as i64).sum();
                    let avg = (sum / channels as i64) as i16;
                    samples.push(avg as f32 / 32768.0);
                }
            }
            4 => {
                let sample_data: Vec<f32> = frame_bytes
                    .chunks_exact(4)
                    .map(|chunk| f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]))
                    .collect();
                
                for chunk in sample_data.chunks(channels) {
                    let sum: f32 = chunk.iter().sum();
                    let avg = sum / channels as f32;
                    samples.push(avg);
                }
            }
            _ => {
                return Err(anyhow::anyhow!("Unsupported sample size: {} bytes", bytes_per_sample));
            }
        }
        
        Ok(samples)
    }
}

impl SpeakerStream {
    pub fn sample_rate(&self) -> u32 {
        self.sample_rate_override.unwrap_or(self.sample_rate)
    }
}

impl Stream for SpeakerStream {
    type Item = f32;

    fn poll_next(
        mut self: std::pin::Pin<&mut Self>,
        cx: &mut std::task::Context<'_>,
    ) -> Poll<Option<Self::Item>> {
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
