use anyhow::Result;
use futures_util::Stream;
use std::sync::{Arc, Mutex};
use std::task::{Poll, Waker};
use std::thread;
use std::time::Duration;

use ringbuf::{
    traits::{Consumer, Producer, Split},
    HeapCons, HeapProd, HeapRb,
};
use wasapi::*;

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
    sample_rate_override: Option<u32>,
    _audio_thread: thread::JoinHandle<()>,
    waker_state: Arc<Mutex<WakerState>>,
}

impl SpeakerInput {
    pub fn new(sample_rate_override: Option<u32>) -> Result<Self> {
        tracing::info!(
            "Windows SpeakerInput initialized with sample rate override: {:?}",
            sample_rate_override
        );
        Ok(Self { sample_rate_override })
    }

    pub fn stream(self) -> SpeakerStream {
        // COM 초기화 (MTA 모드)
        initialize_mta().expect("Failed to initialize COM MTA");

        // 기본 출력 장치 가져오기
        let device = get_default_device(&Direction::Render)
            .expect("Failed to get default render device");

        // 이벤트 핸들 생성
        let h_event = Handle::create_event_for_wasapi()
            .expect("Failed to create event handle");

        // Audio Client 초기화
        let mut audio_client = device.get_iaudioclient()
            .expect("Failed to get audio client");

        // Mix format 가져오기 (시스템의 기본 포맷)
        let desired_format = audio_client.get_mixformat()
            .expect("Failed to get mix format");

        tracing::info!(
            "Windows audio format - sample rate: {}, channels: {}, bits: {}",
            desired_format.get_samplespersec(),
            desired_format.get_nchannels(),
            desired_format.get_bitspersample()
        );

        let blockalign = desired_format.get_blockalign();
        let sample_rate = desired_format.get_samplespersec();

        // loopback 모드로 초기화
        let (def_time, min_time) = audio_client
            .get_periods()
            .expect("Failed to get periods");

        audio_client
            .initialize_client(
                &desired_format,
                def_time,
                &Direction::Capture,
                &ShareMode::Shared,
                true, // loopback 모드 활성화
            )
            .expect("Failed to initialize audio client");

        audio_client.set_handle(&h_event)
            .expect("Failed to set event handle");

        let capture_client = audio_client.get_audiocaptureclient()
            .expect("Failed to get capture client");

        // Ring buffer 생성 (충분한 크기로)
        let rb = HeapRb::<f32>::new(16384);
        let (producer, consumer) = rb.split();

        let waker_state = Arc::new(Mutex::new(WakerState {
            waker: None,
            has_data: false,
        }));

        let waker_state_clone = waker_state.clone();
        let sample_rate_override = self.sample_rate_override;

        // 오디오 캡처 스레드 생성
        let audio_thread = thread::spawn(move || {
            // 스레드에서도 COM 초기화 필요
            initialize_mta().expect("Thread: Failed to initialize COM MTA");

            audio_client.start_stream()
                .expect("Failed to start stream");

            tracing::info!("Windows audio capture thread started");

            loop {
                // 이벤트 대기 (타임아웃 100ms)
                if !h_event.wait_for_event(100) {
                    continue;
                }

                // 사용 가능한 프레임 가져오기
                let num_frames_available = match capture_client.get_next_framesize() {
                    Ok(frames) => frames,
                    Err(e) => {
                        tracing::error!("Failed to get next frame size: {:?}", e);
                        break;
                    }
                };

                if num_frames_available == 0 {
                    continue;
                }

                // 버퍼 가져오기
                match capture_client.read_from_device(
                    desired_format.get_blockalign() as usize,
                    num_frames_available as usize,
                ) {
                    Ok(AudioCaptureClient::F32(data)) => {
                        // 스테레오를 모노로 변환 (두 채널의 평균)
                        let channels = desired_format.get_nchannels() as usize;
                        let mono_samples: Vec<f32> = data
                            .chunks(channels)
                            .map(|chunk| {
                                chunk.iter().sum::<f32>() / channels as f32
                            })
                            .collect();

                        // Ring buffer에 데이터 추가
                        let pushed = producer.push_slice(&mono_samples);
                        if pushed < mono_samples.len() {
                            tracing::warn!(
                                "Windows speaker dropped {} samples",
                                mono_samples.len() - pushed
                            );
                        }

                        // Waker 알림
                        let mut waker_state = waker_state_clone.lock().unwrap();
                        if pushed > 0 && !waker_state.has_data {
                            waker_state.has_data = true;
                            if let Some(waker) = waker_state.waker.take() {
                                drop(waker_state);
                                waker.wake();
                            }
                        }
                    }
                    Ok(_) => {
                        tracing::warn!("Unexpected audio format from capture");
                    }
                    Err(e) => {
                        tracing::error!("Failed to read from device: {:?}", e);
                        break;
                    }
                }

                // 버퍼 해제
                if let Err(e) = capture_client.release_buffer() {
                    tracing::error!("Failed to release buffer: {:?}", e);
                    break;
                }
            }

            if let Err(e) = audio_client.stop_stream() {
                tracing::error!("Failed to stop stream: {:?}", e);
            }

            tracing::info!("Windows audio capture thread stopped");
        });

        SpeakerStream {
            consumer,
            sample_rate,
            sample_rate_override,
            _audio_thread: audio_thread,
            waker_state,
        }
    }
}

impl SpeakerStream {
    pub fn sample_rate(&self) -> u32 {
        tracing::info!(
            tap_sample_rate = self.sample_rate,
            override_sample_rate = self.sample_rate_override,
            "speaker_stream"
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
        // Ring buffer에서 샘플 가져오기
        if let Some(sample) = self.consumer.try_pop() {
            return Poll::Ready(Some(sample));
        }

        // 데이터가 없으면 waker 등록
        {
            let mut state = self.waker_state.lock().unwrap();
            state.has_data = false;
            state.waker = Some(cx.waker().clone());
            drop(state);
        }

        // 다시 한번 시도
        match self.consumer.try_pop() {
            Some(sample) => Poll::Ready(Some(sample)),
            None => Poll::Pending,
        }
    }
}
