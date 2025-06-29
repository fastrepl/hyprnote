use anyhow::Result;
use futures_util::Stream;
use std::collections::VecDeque;
use std::pin::Pin;
use std::task::{Context, Poll};
use std::thread;
use wasapi::*;

pub struct SpeakerInput {
    sample_rate_override: Option<u32>,
}

impl SpeakerInput {
    pub fn new(sample_rate_override: Option<u32>) -> Result<Self> {
        Ok(Self {
            sample_rate_override,
        })
    }

    pub fn stream(self) -> SpeakerStream {
        SpeakerStream::new(self.sample_rate_override)
    }
}

pub struct SpeakerStream {
    receiver: tokio::sync::mpsc::UnboundedReceiver<f32>,
    sample_rate: u32,
    _capture_thread: thread::JoinHandle<()>,
}

impl SpeakerStream {
    pub fn new(sample_rate_override: Option<u32>) -> Self {
        let (sender, receiver) = tokio::sync::mpsc::unbounded_channel();
        
        // Initialize COM in a separate thread for audio capture
        let capture_thread = thread::spawn(move || {
            if let Err(e) = run_capture_thread(sender, sample_rate_override) {
                eprintln!("Audio capture error: {:?}", e);
            }
        });

        // Default to 16kHz if not specified
        let sample_rate = sample_rate_override.unwrap_or(16000);

        Self {
            receiver,
            sample_rate,
            _capture_thread: capture_thread,
        }
    }

    pub fn sample_rate(&self) -> u32 {
        self.sample_rate
    }
}

impl Stream for SpeakerStream {
    type Item = f32;

    fn poll_next(
        mut self: Pin<&mut Self>,
        cx: &mut Context<'_>,
    ) -> Poll<Option<Self::Item>> {
        self.receiver.poll_recv(cx)
    }
}

fn run_capture_thread(
    sender: tokio::sync::mpsc::UnboundedSender<f32>,
    sample_rate_override: Option<u32>,
) -> Result<()> {
    // Initialize COM
    let hr = initialize_mta();
    if hr.is_err() {
        return Err(anyhow::anyhow!("Failed to initialize COM: {:?}", hr));
    }
    
    // Get default audio capture device
    let device = get_default_device(&Direction::Capture)?;
    
    // Create audio client
    let mut audio_client = device.get_iaudioclient()?;
    
    // Get mix format
    let wave_format = audio_client.get_mixformat()?;
    
    // Initialize audio client in shared mode
    let desired_duration_hns = 10_000_000; // 1 second in 100-nanosecond units
    
    // Use StreamMode enum which includes the share mode and other settings
    let stream_mode = StreamMode::EventsShared {
        buffer_duration_hns: desired_duration_hns,
        autoconvert: true,
    };
    
    audio_client.initialize_client(
        &wave_format,
        &Direction::Capture,
        &stream_mode,
    )?;
    
    // Get the actual period of the audio engine
    let render_client = audio_client.get_audiocaptureclient()?;
    
    // Create event handle for event-driven mode
    let event_handle = audio_client.set_get_eventhandle()?;
    
    // Start audio capture
    audio_client.start_stream()?;
    
    // Get format details
    let channels = wave_format.get_nchannels();
    let sample_rate = wave_format.get_samplespersec();
    let bits_per_sample = wave_format.get_bitspersample();
    let sample_type = wave_format.get_subformat()?;
    
    // Calculate resampling ratio if needed
    let target_sample_rate = sample_rate_override.unwrap_or(16000);
    let resample_ratio = sample_rate as f32 / target_sample_rate as f32;
    
    // Capture loop
    let mut sample_accumulator = 0.0f32;
    let mut sample_count = 0;

    let buffer_frame_count = audio_client.get_buffer_size()?;
    let bytes_per_frame = (bits_per_sample as u32 / 8) * channels as u32;
    let buffer_size_bytes = buffer_frame_count as usize * bytes_per_frame as usize;
    let mut capture_buffer = vec![0u8; buffer_size_bytes];
    
    loop {
        // Wait for audio data to be available
        if event_handle.wait_for_event(100).is_err() {
            // Timeout - check if we should continue
            continue;
        }
        
        // Check if we have data available
        match render_client.get_next_packet_size() {
            Ok(packet_size) => {
                let packet_size = packet_size.unwrap_or(0);
                if packet_size == 0 {
                    continue;
                }
                
                // Get buffer - read_from_device writes to the provided buffer
                match render_client.read_from_device(&mut capture_buffer[..packet_size as usize * bytes_per_frame as usize]) {
                    Ok((frames_read, _flags)) => {
                        // Process audio data based on format
                        let bytes_read = frames_read as usize * bytes_per_frame as usize;
                        let data_slice = &capture_buffer[..bytes_read];
                        
                        match sample_type {
                            SampleType::Float => {
                                // 32-bit float samples
                                let samples: &[f32] = unsafe {
                                    std::slice::from_raw_parts(
                                        data_slice.as_ptr() as *const f32,
                                        data_slice.len() / 4,
                                    )
                                };
                                
                                // Process all channels but only use the first one
                                for (i, &sample) in samples.iter().enumerate() {
                                    if i % channels as usize == 0 {
                                        // Simple downsampling by averaging
                                        sample_accumulator += sample;
                                        sample_count += 1;
                                        
                                        if sample_count >= resample_ratio as usize {
                                            let averaged_sample = sample_accumulator / sample_count as f32;
                                            if sender.send(averaged_sample).is_err() {
                                                // Receiver dropped, exit
                                                audio_client.stop_stream()?;
                                                return Ok(());
                                            }
                                            sample_accumulator = 0.0;
                                            sample_count = 0;
                                        }
                                    }
                                }
                            }
                            SampleType::Int => {
                                // Integer samples (assume 16-bit)
                                if bits_per_sample == 16 {
                                    let samples: &[i16] = unsafe {
                                        std::slice::from_raw_parts(
                                            data_slice.as_ptr() as *const i16,
                                            data_slice.len() / 2,
                                        )
                                    };
                                    
                                    // Process all channels but only use the first one
                                    for (i, &sample) in samples.iter().enumerate() {
                                        if i % channels as usize == 0 {
                                            let normalized = sample as f32 / 32768.0;
                                            
                                            // Simple downsampling by averaging
                                            sample_accumulator += normalized;
                                            sample_count += 1;
                                            
                                            if sample_count >= resample_ratio as usize {
                                                let averaged_sample = sample_accumulator / sample_count as f32;
                                                if sender.send(averaged_sample).is_err() {
                                                    // Receiver dropped, exit
                                                    audio_client.stop_stream()?;
                                                    return Ok(());
                                                }
                                                sample_accumulator = 0.0;
                                                sample_count = 0;
                                            }
                                        }
                                    }
                                } else if bits_per_sample == 32 {
                                    let samples: &[i32] = unsafe {
                                        std::slice::from_raw_parts(
                                            data_slice.as_ptr() as *const i32,
                                            data_slice.len() / 4,
                                        )
                                    };
                                    
                                    // Process all channels but only use the first one
                                    for (i, &sample) in samples.iter().enumerate() {
                                        if i % channels as usize == 0 {
                                            let normalized = sample as f32 / 2147483648.0;
                                            
                                            // Simple downsampling by averaging
                                            sample_accumulator += normalized;
                                            sample_count += 1;
                                            
                                            if sample_count >= resample_ratio as usize {
                                                let averaged_sample = sample_accumulator / sample_count as f32;
                                                if sender.send(averaged_sample).is_err() {
                                                    // Receiver dropped, exit
                                                    audio_client.stop_stream()?;
                                                    return Ok(());
                                                }
                                                sample_accumulator = 0.0;
                                                sample_count = 0;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    Err(e) => {
                        eprintln!("Error reading from device: {:?}", e);
                    }
                }
            }
            Err(e) => {
                eprintln!("Error getting packet size: {:?}", e);
            }
        }
    }
}
