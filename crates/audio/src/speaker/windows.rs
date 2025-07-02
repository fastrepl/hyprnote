use anyhow::Result;
use futures_util::Stream;
use std::collections::VecDeque;
use std::sync::{Arc, Mutex};
use std::task::{Poll, Waker};
use std::thread;
use tracing::{debug, error, trace};
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
        SpeakerStream::new()
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
    pub fn new() -> Self {
        debug!("Creating new SpeakerStream");

        let sample_queue = Arc::new(Mutex::new(VecDeque::new()));
        let waker_state = Arc::new(Mutex::new(WakerState {
            waker: None,
            has_data: false,
        }));

        // macOS처럼 생성자에서 즉시 백그라운드 캡처 시작
        let queue_clone = sample_queue.clone();
        let waker_clone = waker_state.clone();

        let capture_thread = thread::spawn(move || {
            if let Err(e) = Self::capture_audio_loop(queue_clone, waker_clone) {
                error!("Audio capture loop failed: {}", e);
            }
        });

        Self {
            sample_queue,
            waker_state,
            _capture_thread: capture_thread,
        }
    }

    pub fn sample_rate(&self) -> u32 {
        44100
    }

    // macOS의 Core Audio 콜백처럼 백그라운드에서 계속 실행
    fn capture_audio_loop(
        sample_queue: Arc<Mutex<VecDeque<f32>>>,
        waker_state: Arc<Mutex<WakerState>>,
    ) -> Result<()> {
        debug!("Starting audio capture loop");

        let device = get_default_device(&Direction::Render)?;
        let mut audio_client = device.get_iaudioclient()?;

        let desired_format = WaveFormat::new(32, 32, &SampleType::Float, 44100, 2, None);

        let (def_time, min_time) = audio_client.get_device_period()?;
        debug!("default period {}, min period {}", def_time, min_time);

        let mode = StreamMode::EventsShared {
            autoconvert: true,
            buffer_duration_hns: min_time,
        };

        audio_client.initialize_client(&desired_format, &Direction::Capture, &mode)?;
        debug!("initialized capture");

        let h_event = audio_client.set_get_eventhandle()?;
        let render_client = audio_client.get_audiocaptureclient()?;

        audio_client.start_stream()?;
        debug!("started audio stream");

        // macOS 콜백처럼 계속 실행되는 루프
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

            // 바이트를 f32로 변환하고 큐에 푸시
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
                // macOS처럼 큐에 푸시하고 waker 깨우기
                {
                    let mut queue = sample_queue.lock().unwrap();
                    queue.extend(samples);

                    // 큐가 너무 커지지 않도록 제한
                    let len = queue.len();
                    if len > 8192 {
                        queue.drain(0..(len - 8192));
                    }
                }

                // waker 깨우기 (macOS 콜백과 동일한 패턴)
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
        mut self: std::pin::Pin<&mut Self>,
        cx: &mut std::task::Context<'_>,
    ) -> Poll<Option<Self::Item>> {
        // macOS처럼 단순히 큐에서 꺼내기만
        {
            let mut queue = self.sample_queue.lock().unwrap();
            if let Some(sample) = queue.pop_front() {
                return Poll::Ready(Some(sample));
            }
        }

        // 데이터가 없으면 waker 등록하고 대기 (macOS와 동일)
        {
            let mut state = self.waker_state.lock().unwrap();
            state.has_data = false;
            state.waker = Some(cx.waker().clone());
        }

        // 한 번 더 확인 (race condition 방지)
        {
            let mut queue = self.sample_queue.lock().unwrap();
            match queue.pop_front() {
                Some(sample) => Poll::Ready(Some(sample)),
                None => Poll::Pending,
            }
        }
    }
}

// Capture loop, capture samples and send in chunks of "chunksize" frames to channel
fn capture_loop(tx_capt: std::sync::mpsc::SyncSender<Vec<u8>>, chunksize: usize) -> Result<()> {
    // Use `Direction::Capture` for normal capture,
    // or `Direction::Render` for loopback mode (for capturing from a playback device).
    let device = get_default_device(&Direction::Render)?;

    let mut audio_client = device.get_iaudioclient()?;

    let desired_format = WaveFormat::new(32, 32, &SampleType::Float, 44100, 2, None);

    let blockalign = desired_format.get_blockalign();
    debug!("Desired capture format: {:?}", desired_format);

    let (def_time, min_time) = audio_client.get_device_period()?;
    debug!("default period {}, min period {}", def_time, min_time);

    let mode = StreamMode::EventsShared {
        autoconvert: true,
        buffer_duration_hns: min_time,
    };
    audio_client.initialize_client(&desired_format, &Direction::Capture, &mode)?;
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

    loop {
        while sample_queue.len() > (blockalign as usize * chunksize) {
            debug!("pushing samples");
            let mut chunk = vec![0u8; blockalign as usize * chunksize];
            for element in chunk.iter_mut() {
                *element = sample_queue.pop_front().unwrap();
            }
            tx_capt.send(chunk)?;
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
