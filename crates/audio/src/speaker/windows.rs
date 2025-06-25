use std::sync::{Arc, Mutex};
use std::task::{Poll, Waker};
use std::thread;
use std::sync::mpsc;
use std::collections::VecDeque;
use ringbuf::traits::Observer;
use anyhow::Result;
use futures_util::Stream;
use ringbuf::{
    traits::{Consumer, Producer, Split},
    HeapCons, HeapProd, HeapRb,
};

use wasapi::*;

struct WakerState {
    waker: Option<Waker>,
    has_data: bool,
}

pub struct SpeakerInput {
    sample_rate_override: Option<u32>,
}

pub struct SpeakerStream {
    consumer: HeapCons<f32>,
    sample_rate: u32,
    sample_rate_override: Option<u32>,
    waker_state: Arc<Mutex<WakerState>>,
    _capture_handle: thread::JoinHandle<()>,
}

impl SpeakerInput {
    pub fn new(sample_rate_override: Option<u32>) -> Result<Self> {
        // Initialize WASAPI MTA (Multi-Threaded Apartment)
        initialize_mta().ok()?;
        
        Ok(Self {
            sample_rate_override,
        })
    }

    pub fn stream(self) -> Result<SpeakerStream> {
        let rb = HeapRb::<f32>::new(16384); // Larger buffer for Windows
        let (producer, consumer) = rb.split();

        let waker_state = Arc::new(Mutex::new(WakerState {
            waker: None,
            has_data: false,
        }));

        let waker_state_clone = waker_state.clone();
        let sample_rate_override = self.sample_rate_override;

        let capture_handle = thread::Builder::new()
            .name("WASAPI Capture".to_string())
            .spawn(move || {
                if let Err(e) = Self::capture_loop(producer, waker_state_clone, sample_rate_override) {
                    tracing::error!("WASAPI capture loop failed: {}", e);
                }
            })?;

        // Get the actual sample rate from a temporary device connection
        let sample_rate = Self::get_device_sample_rate()?;

        Ok(SpeakerStream {
            consumer,
            sample_rate,
            sample_rate_override,
            waker_state,
            _capture_handle: capture_handle,
        })
    }

    fn get_device_sample_rate() -> Result<u32> {
        // Use loopback mode (Direction::Render) to capture from speakers
        let device = get_default_device(&Direction::Render)
            .map_err(|e| anyhow::anyhow!("Failed to get default render device: {:?}", e))?;
        
        let mut audio_client = device.get_iaudioclient()
            .map_err(|e| anyhow::anyhow!("Failed to get audio client: {:?}", e))?;

        // Try to get the mix format from the device
        let mix_format = audio_client.get_mixformat()
            .map_err(|e| anyhow::anyhow!("Failed to get mix format: {:?}", e))?;
        
        Ok(mix_format.get_samplespersec())
    }

    fn capture_loop(
        mut producer: HeapProd<f32>,
        waker_state: Arc<Mutex<WakerState>>,
        sample_rate_override: Option<u32>,
    ) -> Result<()> {
        // Use loopback mode (Direction::Render) to capture from speakers
        let device = get_default_device(&Direction::Render)
            .map_err(|e| anyhow::anyhow!("Failed to get default render device: {:?}", e))?;

        let mut audio_client = device.get_iaudioclient()
            .map_err(|e| anyhow::anyhow!("Failed to get audio client: {:?}", e))?;

        // Get the default format or use a common format
        let desired_format = if let Ok(mix_format) = audio_client.get_mixformat() {
            tracing::info!(
                "Using mix format - channels: {}, sample_rate: {}, bits_per_sample: {}",
                mix_format.get_nchannels(),
                mix_format.get_samplespersec(),
                mix_format.get_bitspersample()
            );
            mix_format
        } else {
            // Fallback to a common format
            WaveFormat::new(32, 32, &SampleType::Float, 44100, 2, None)
        };

        let blockalign = desired_format.get_blockalign();
        let sample_rate = desired_format.get_samplespersec();
        let channels = desired_format.get_nchannels();

        tracing::info!(
            "WASAPI capture format - sample_rate: {}, channels: {}, blockalign: {}",
            sample_rate, channels, blockalign
        );

        let (def_time, min_time) = audio_client.get_device_period()
            .map_err(|e| anyhow::anyhow!("Failed to get device period: {:?}", e))?;

        tracing::debug!("Device periods - default: {}, minimum: {}", def_time, min_time);

        let mode = StreamMode::EventsShared {
            autoconvert: true,
            buffer_duration_hns: min_time,
        };

        audio_client.initialize_client(&desired_format, &Direction::Render, &mode)
            .map_err(|e| anyhow::anyhow!("Failed to initialize audio client: {:?}", e))?;

        let h_event = audio_client.set_get_eventhandle()
            .map_err(|e| anyhow::anyhow!("Failed to set event handle: {:?}", e))?;

        let buffer_frame_count = audio_client.get_buffer_size()
            .map_err(|e| anyhow::anyhow!("Failed to get buffer size: {:?}", e))?;

        let render_client = audio_client.get_audiocaptureclient()
            .map_err(|e| anyhow::anyhow!("Failed to get capture client: {:?}", e))?;

        let mut sample_queue: VecDeque<u8> = VecDeque::with_capacity(
            100 * blockalign as usize * (1024 + 2 * buffer_frame_count as usize),
        );

        // Start the stream
        audio_client.start_stream()
            .map_err(|e| anyhow::anyhow!("Failed to start stream: {:?}", e))?;

        tracing::info!("WASAPI loopback capture started");

        loop {
            // Convert bytes to f32 samples and push to ringbuf
            while sample_queue.len() >= (blockalign as usize) {
                let mut frame_bytes = vec![0u8; blockalign as usize];
                for i in 0..blockalign as usize {
                    if let Some(byte) = sample_queue.pop_front() {
                        frame_bytes[i] = byte;
                    } else {
                        break;
                    }
                }

                // Convert bytes to f32 samples based on format
                if desired_format.get_bitspersample() == 32 && 
                   desired_format.get_subformat()? == SampleType::Float {
                    // 32-bit float format
                    let samples_per_frame = channels as usize;
                    for i in 0..samples_per_frame {
                        let byte_offset = i * 4;
                        if byte_offset + 4 <= frame_bytes.len() {
                            let sample_bytes = [
                                frame_bytes[byte_offset],
                                frame_bytes[byte_offset + 1],
                                frame_bytes[byte_offset + 2],
                                frame_bytes[byte_offset + 3],
                            ];
                            let sample = f32::from_le_bytes(sample_bytes);
                            
                            // For stereo, mix down to mono by averaging channels
                            let mono_sample = if channels == 2 && i == 0 {
                                // Get the next channel sample for mixing
                                if byte_offset + 8 <= frame_bytes.len() {
                                    let next_sample_bytes = [
                                        frame_bytes[byte_offset + 4],
                                        frame_bytes[byte_offset + 5],
                                        frame_bytes[byte_offset + 6],
                                        frame_bytes[byte_offset + 7],
                                    ];
                                    let next_sample = f32::from_le_bytes(next_sample_bytes);
                                    (sample + next_sample) * 0.5
                                } else {
                                    sample
                                }
                            } else if channels == 2 && i == 1 {
                                // Skip the second channel as we already mixed it
                                continue;
                            } else {
                                sample
                            };

                            let pushed = producer.try_push(mono_sample);
                            if pushed.is_err() {
                                tracing::warn!("Audio buffer full, dropping sample");
                            }
                        }
                    }
                } else {
                    // For other formats, we might need more conversion logic
                    tracing::warn!("Unsupported audio format for conversion");
                }
            }

            // Wake up the stream if we have new data
            {
                let mut state = waker_state.lock().unwrap();
                if !state.has_data && producer.occupied_len() > 0 {
                    state.has_data = true;
                    if let Some(waker) = state.waker.take() {
                        drop(state);
                        waker.wake();
                    }
                }
            }

            // Read new data from the device
            match render_client.read_from_device_to_deque(&mut sample_queue) {
                Ok(_) => {},
                Err(e) => {
                    tracing::warn!("Failed to read from device: {:?}", e);
                }
            }

            // Wait for new data with timeout
            if h_event.wait_for_event(1000).is_err() {
                tracing::debug!("WASAPI event timeout, continuing...");
                // Don't break on timeout, just continue the loop
            }
        }
    }
}

impl SpeakerStream {
    pub fn sample_rate(&self) -> u32 {
        tracing::info!(
            device_sample_rate = self.sample_rate,
            override_sample_rate = self.sample_rate_override,
            "windows_speaker_stream"
        );

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

        // Try once more after setting the waker
        match self.consumer.try_pop() {
            Some(sample) => Poll::Ready(Some(sample)),
            None => Poll::Pending,
        }
    }
}