use anyhow::Result;
use futures_util::Stream;
use ringbuf::traits::Observer;
use ringbuf::{
    traits::{Consumer, Producer, Split},
    HeapCons, HeapProd, HeapRb,
};
use std::collections::VecDeque;
use std::sync::mpsc;
use std::sync::{Arc, Mutex};
use std::task::{Poll, Waker};
use std::thread;
use wasapi::*;
use tracing::debug;
use tracing::error;
use tracing::trace;

struct WakerState {
    waker: Option<Waker>,
    has_data: bool,
}

pub struct SpeakerInput {
    sample_rate_override: Option<u32>,
}

pub struct SpeakerStream {
    receiver: std::sync::mpsc::Receiver<Vec<f32>>,
    current_chunk: Vec<f32>,
    chunk_index: usize,
    sample_rate: u32,
    sample_rate_override: Option<u32>,
    _capture_handle: thread::JoinHandle<()>,
}

impl SpeakerInput {
    pub fn new(sample_rate_override: Option<u32>) -> Result<Self> {
        // COM 초기화를 시도하되, 이미 초기화된 경우 무시
        match initialize_mta().ok() {
            Ok(_) => tracing::debug!("COM MTA initialized successfully"),
            Err(e) => {
                // COM 초기화 에러를 문자열로 확인
                let error_str = format!("{:?}", e);
                if error_str.contains("0x80010106") || 
                   error_str.contains("Cannot change thread mode") ||
                   error_str.contains("RPC_E_CHANGED_MODE") {
                    tracing::debug!("COM already initialized in different mode, continuing...");
                } else {
                    tracing::warn!("COM initialization failed: {:?}", e);
                    // COM 초기화 실패는 치명적이지 않을 수 있으므로 계속 진행
                    tracing::info!("Continuing without COM initialization...");
                }
            }
        }

        Ok(Self {
            sample_rate_override,
        })
    }

    pub fn stream(self) -> Result<SpeakerStream> {
        let (tx, rx) = std::sync::mpsc::sync_channel(8); // 작은 버퍼

        let capture_handle = thread::Builder::new()
            .name("WASAPI Capture".to_string())
            .spawn(move || {
                if let Err(e) = Self::capture_loop_simple(tx) {
                    tracing::error!("WASAPI capture failed: {}", e);
                }
            })?;

        Ok(SpeakerStream {
            receiver: rx,
            current_chunk: Vec::new(),
            chunk_index: 0,
            sample_rate: 44100, // 기본값
            sample_rate_override: self.sample_rate_override,
            _capture_handle: capture_handle,
        })
    }

    fn capture_loop_simple(tx_capt: std::sync::mpsc::SyncSender<Vec<f32>>) -> Result<()> {
        let device = get_default_device(&Direction::Render)?;

        let mut audio_client = device.get_iaudioclient()?;

        let desired_format = WaveFormat::new(32, 32, &SampleType::Float, 44100, 2, None);

        let blockalign = desired_format.get_blockalign();
        let channels = desired_format.get_nchannels() as usize;
        debug!("Desired capture format: {:?}", desired_format);
        debug!("Channels: {}, Block align: {}", channels, blockalign);

        let (def_time, min_time) = audio_client.get_device_period()?;
        debug!("default period {}, min period {}", def_time, min_time);

        let mode = StreamMode::EventsShared {
            autoconvert: true,
            buffer_duration_hns: min_time,
        };
        audio_client.initialize_client(&desired_format, &Direction::Render, &mode)?;
        debug!("initialized capture");

        let h_event = audio_client.set_get_eventhandle()?;

        let buffer_frame_count = audio_client.get_buffer_size()?;

        let render_client = audio_client.get_audiocaptureclient()?;
        let mut sample_queue: VecDeque<u8> = VecDeque::with_capacity(
            100 * blockalign as usize * (1024 + 2 * buffer_frame_count as usize),
        );
        let session_control = audio_client.get_audiosessioncontrol()?;

        debug!("state before start: {:?}", session_control.get_state());
        audio_client.start_stream()?;
        debug!("state after start: {:?}", session_control.get_state());

        let chunksize = 1024; // frames
        loop {
            while sample_queue.len() >= (blockalign as usize * chunksize) {
                debug!("pushing samples");
                
                // 바이트 데이터를 f32 조합으로 변환
                let mut f32_chunk = Vec::with_capacity(chunksize);
                
                for _ in 0..chunksize {
                    // 한 프레임 (모든 채널) 처리
                    let mut frame_samples = Vec::with_capacity(channels);
                    
                    for _ in 0..channels {
                        // 4바이트씩 f32로 변환
                        if sample_queue.len() >= 4 {
                            let bytes = [
                                sample_queue.pop_front().unwrap(),
                                sample_queue.pop_front().unwrap(),
                                sample_queue.pop_front().unwrap(),
                                sample_queue.pop_front().unwrap(),
                            ];
                            let sample = f32::from_le_bytes(bytes);
                            frame_samples.push(sample);
                        } else {
                            break;
                        }
                    }
                    
                    // 스테레오를 모노로 믹스다운 (2채널 -> 1채널)
                    if frame_samples.len() == 2 {
                        let mono_sample = (frame_samples[0] + frame_samples[1]) * 0.5;
                        f32_chunk.push(mono_sample);
                    } else if frame_samples.len() == 1 {
                        f32_chunk.push(frame_samples[0]);
                    }
                    
                    if frame_samples.is_empty() {
                        break;
                    }
                }
                
                if !f32_chunk.is_empty() {
                    if let Err(_) = tx_capt.try_send(f32_chunk) {
                        debug!("Audio buffer full, dropping chunk");
                    }
                }
            }
            
            trace!("capturing");
            render_client.read_from_device_to_deque(&mut sample_queue)?;
            if h_event.wait_for_event(3000).is_err() {
                error!("timeout error, stopping capture");
                audio_client.stop_stream()?;
                break;
            }
        }
        Ok(())
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
        // 현재 청크에서 샘플 반환
        if self.chunk_index < self.current_chunk.len() {
            let sample = self.current_chunk[self.chunk_index];
            self.chunk_index += 1;
            return Poll::Ready(Some(sample));
        }

        // 새 청크 받기 (논블로킹)
        match self.receiver.try_recv() {
            Ok(chunk) => {
                self.current_chunk = chunk;
                self.chunk_index = 0;

                if !self.current_chunk.is_empty() {
                    let sample = self.current_chunk[0];
                    self.chunk_index = 1;
                    Poll::Ready(Some(sample))
                } else {
                    Poll::Pending
                }
            }
            Err(std::sync::mpsc::TryRecvError::Empty) => {
                cx.waker().wake_by_ref();
                Poll::Pending
            }
            Err(std::sync::mpsc::TryRecvError::Disconnected) => Poll::Ready(None),
        }
    }
}
