use anyhow::Result;
use futures_util::Stream;
use std::collections::VecDeque;
use std::task::Poll;
use std::thread;
use tracing::{debug, error, trace, warn};
use wasapi::*;

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
        // COM 초기화는 wasapi 라이브러리가 내부적으로 처리
        Ok(Self {
            sample_rate_override,
        })
    }

    pub fn stream(self) -> SpeakerStream {
        let (tx, rx) = std::sync::mpsc::sync_channel(16); // 더 큰 버퍼

        let capture_handle = thread::Builder::new()
            .name("WASAPI Loopback Capture".to_string())
            .spawn(move || {
                if let Err(e) = Self::capture_loop(tx) {
                    error!("WASAPI capture failed: {}", e);
                }
            })
            .unwrap();

        SpeakerStream {
            receiver: rx,
            current_chunk: Vec::new(),
            chunk_index: 0,
            sample_rate: 44100,
            sample_rate_override: self.sample_rate_override,
            _capture_handle: capture_handle,
        }
    }

    fn capture_loop(tx: std::sync::mpsc::SyncSender<Vec<f32>>) -> Result<()> {
        debug!("Starting WASAPI loopback capture");

        // 기본 렌더 디바이스 가져오기
        let device = get_default_device(&Direction::Render).map_err(|e| {
            error!("Failed to get default render device. This might be due to:");
            error!("1. No audio output device available");
            error!("2. Insufficient permissions for loopback capture");
            error!("3. Audio service not running");
            error!("Try: Run as administrator, check Windows audio settings");
            e
        })?;

        debug!("Successfully got default render device");

        // 오디오 클라이언트 생성
        let mut audio_client = device.get_iaudioclient()?;

        // 디바이스의 기본 믹스 포맷 사용 (호환성 최대화)
        let format = audio_client.get_mixformat()?;
        debug!("Device format: {:?}", format);

        let channels = format.get_nchannels() as usize;
        let sample_rate = format.get_samplespersec();
        let bits_per_sample = format.get_bitspersample();
        let block_align = format.get_blockalign();

        debug!(
            "Audio format - channels: {}, sample_rate: {}, bits: {}, block_align: {}",
            channels, sample_rate, bits_per_sample, block_align
        );

        // 디바이스 버퍼 기간 정보
        let (default_period, minimum_period) = audio_client.get_device_period()?;
        debug!(
            "Device periods - default: {}, minimum: {}",
            default_period, minimum_period
        );

        // 넉넉한 버퍼 크기 설정 (안정성 우선)
        let buffer_duration = std::cmp::max(default_period * 3, 200000); // 최소 20ms

        let mode = StreamMode::EventsShared {
            autoconvert: true,
            buffer_duration_hns: buffer_duration,
        };

        debug!(
            "Initializing audio client with buffer duration: {} ({}ms)",
            buffer_duration,
            buffer_duration / 10000
        );

        // 오디오 클라이언트 초기화
        audio_client.initialize_client(&format, &Direction::Render, &mode)?;
        debug!("Audio client initialized successfully");

        // 이벤트 핸들 설정
        let event_handle = audio_client.set_get_eventhandle()?;

        // 버퍼 크기 확인
        let buffer_size = audio_client.get_buffer_size()?;
        debug!("Actual buffer size: {} frames", buffer_size);

        // 캡처 클라이언트 생성
        let capture_client = audio_client.get_audiocaptureclient()?;

        // 샘플 큐 초기화
        let queue_capacity = (block_align as usize) * (buffer_size as usize) * 10;
        let mut sample_queue: VecDeque<u8> = VecDeque::with_capacity(queue_capacity);

        // 세션 제어
        let session_control = audio_client.get_audiosessioncontrol()?;
        debug!(
            "Session state before start: {:?}",
            session_control.get_state()
        );

        // 스트림 시작
        audio_client.start_stream()?;
        debug!("Audio stream started successfully");

        let chunk_size = 1024; // 처리할 프레임 수
        let bytes_per_frame = block_align as usize;
        let bytes_per_sample = (bits_per_sample / 8) as usize;

        loop {
            // 충분한 데이터가 있으면 처리
            while sample_queue.len() >= chunk_size * bytes_per_frame {
                let mut audio_chunk = Vec::with_capacity(chunk_size);

                for _ in 0..chunk_size {
                    if sample_queue.len() < bytes_per_frame {
                        break;
                    }

                    let mut channel_samples = Vec::with_capacity(channels);

                    // 각 채널의 샘플 읽기
                    for _ in 0..channels {
                        if sample_queue.len() >= bytes_per_sample {
                            let sample = match bytes_per_sample {
                                4 => {
                                    // 32-bit float
                                    let bytes = [
                                        sample_queue.pop_front().unwrap(),
                                        sample_queue.pop_front().unwrap(),
                                        sample_queue.pop_front().unwrap(),
                                        sample_queue.pop_front().unwrap(),
                                    ];
                                    f32::from_le_bytes(bytes)
                                }
                                2 => {
                                    // 16-bit int
                                    let bytes = [
                                        sample_queue.pop_front().unwrap(),
                                        sample_queue.pop_front().unwrap(),
                                    ];
                                    i16::from_le_bytes(bytes) as f32 / 32768.0
                                }
                                _ => {
                                    // 다른 포맷은 0으로 처리
                                    for _ in 0..bytes_per_sample {
                                        sample_queue.pop_front();
                                    }
                                    0.0
                                }
                            };
                            channel_samples.push(sample);
                        }
                    }

                    // 다중 채널을 모노로 믹스
                    if !channel_samples.is_empty() {
                        let mono_sample =
                            channel_samples.iter().sum::<f32>() / channel_samples.len() as f32;
                        audio_chunk.push(mono_sample);
                    }
                }

                // 오디오 청크 전송
                if !audio_chunk.is_empty() {
                    if tx.try_send(audio_chunk).is_err() {
                        debug!("Audio buffer full, dropping chunk");
                    }
                }
            }

            // 디바이스에서 새 오디오 데이터 읽기
            match capture_client.read_from_device_to_deque(&mut sample_queue) {
                Ok(_) => {
                    trace!("Read audio data from device");
                }
                Err(e) => {
                    // 에러 코드 문자열에서 확인
                    let error_str = format!("{:?}", e);
                    if error_str.contains("0x88890001") {
                        // AUDCLNT_E_BUFFER_EMPTY - 정상적인 상황
                        trace!("Audio buffer empty, continuing...");
                    } else if error_str.contains("0x88890003") {
                        // AUDCLNT_E_BUFFER_ERROR - 버퍼 문제
                        error!("Buffer error detected, attempting to recover...");
                        std::thread::sleep(std::time::Duration::from_millis(10));
                        continue;
                    } else {
                        error!("Audio capture error: {}", e);
                        break;
                    }
                }
            }

            // 이벤트 대기 (타임아웃 5초)
            if event_handle.wait_for_event(5000).is_err() {
                error!("Event wait timeout - audio device may be unavailable");
                break;
            }
        }

        // 정리
        debug!("Stopping audio capture");
        let _ = audio_client.stop_stream();
        debug!("Audio capture stopped");

        Ok(())
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
        // 현재 청크에서 샘플 반환
        if self.chunk_index < self.current_chunk.len() {
            let sample = self.current_chunk[self.chunk_index];
            self.chunk_index += 1;
            return Poll::Ready(Some(sample));
        }

        // 새 청크 받기
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
