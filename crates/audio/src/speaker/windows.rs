use anyhow::Result;
use futures_util::Stream;
use std::collections::VecDeque;
use std::pin::Pin;
use std::task::{Context, Poll};
use wasapi::*;

pub struct SpeakerInput {
    sample_rate: u32,
}

impl SpeakerInput {
    pub fn new(sample_rate_override: Option<u32>) -> Result<Self> {
        Ok(Self {
            sample_rate: sample_rate_override.unwrap_or(16000),
        })
    }

    pub fn stream(self) -> SpeakerStream {
        SpeakerStream::new(self.sample_rate)
    }
}

pub struct SpeakerStream {
    audio_client: AudioClient,
    capture_client: AudioCaptureClient,
    h_event: Handle,
    sample_queue: VecDeque<f32>,
    sample_rate: u32,
    _session_control: AudioSessionControl,
}

// SAFETY: The Windows audio COM objects are initialized with MTA (Multi-Threaded Apartment)
// and the stream is designed to be owned by a single task at a time, making it safe to
// transfer ownership between threads.
unsafe impl Send for SpeakerStream {}

impl SpeakerStream {
    pub fn new(sample_rate: u32) -> Self {
        || -> Result<Self> {
            // TODO: temporary wrapper closer
            initialize_mta().ok()?;

            // Direction::Render로 시스템 오디오 캡처 (loopback mode)
            let device = get_default_device(&Direction::Render)?;
            let mut audio_client = device.get_iaudioclient()?;

            // 32비트 float 포맷 설정
            let desired_format = WaveFormat::new(32, 32, &SampleType::Float, 44100, 2, None);

            let (_, min_time) = audio_client.get_device_period()?;

            let mode = StreamMode::EventsShared {
                autoconvert: true,
                buffer_duration_hns: min_time,
            };

            // Direction::Capture로 초기화 (loopback 모드에서 필요)
            audio_client.initialize_client(&desired_format, &Direction::Capture, &mode)?;

            let h_event = audio_client.set_get_eventhandle()?;
            let capture_client = audio_client.get_audiocaptureclient()?;
            let session_control = audio_client.get_audiosessioncontrol()?;

            // 스트림 시작
            audio_client.start_stream()?;

            Ok(Self {
                audio_client,
                capture_client,
                h_event,
                sample_queue: VecDeque::with_capacity(44100 * 2), // 1초 버퍼
                sample_rate,
                _session_control: session_control,
            })
        }()
        .unwrap()
    }

    pub fn sample_rate(&self) -> u32 {
        self.sample_rate
    }

    fn read_samples(&mut self) -> Result<()> {
        // 타임아웃 없이 즉시 체크
        if self.h_event.wait_for_event(0).is_ok() {
            let mut buffer = VecDeque::new();
            self.capture_client.read_from_device_to_deque(&mut buffer)?;

            // 바이트를 f32로 변환 (little-endian)
            while buffer.len() >= 4 {
                let mut bytes = [0u8; 4];
                for i in 0..4 {
                    bytes[i] = buffer.pop_front().unwrap();
                }
                let sample = f32::from_le_bytes(bytes);
                self.sample_queue.push_back(sample);
            }
        }
        Ok(())
    }
}

impl Stream for SpeakerStream {
    type Item = f32;

    fn poll_next(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        // 새로운 샘플 읽기 시도
        if let Err(e) = self.read_samples() {
            eprintln!("Error reading samples: {}", e);
            return Poll::Ready(None);
        }

        // 큐에서 샘플 가져오기
        if let Some(sample) = self.sample_queue.pop_front() {
            Poll::Ready(Some(sample))
        } else {
            // 데이터가 없으면 waker 등록하고 대기
            cx.waker().wake_by_ref();
            Poll::Pending
        }
    }
}

impl Drop for SpeakerStream {
    fn drop(&mut self) {
        // 스트림 정지
        let _ = self.audio_client.stop_stream();
    }
}
