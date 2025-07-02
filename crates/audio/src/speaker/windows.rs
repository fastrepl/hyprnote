use anyhow::Result;
use futures_util::Stream;
use std::collections::VecDeque;
use std::sync::{Arc, Mutex};
use std::task::{Poll, Waker};
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
    audio_client: Option<wasapi::AudioClient>,
    render_client: Option<wasapi::AudioCaptureClient>,
    h_event: Option<wasapi::Handle>,
    sample_queue: VecDeque<f32>,
    waker_state: Arc<Mutex<WakerState>>,
    initialized: bool,
}

unsafe impl Send for SpeakerStream {}

impl SpeakerStream {
    pub fn new() -> Self {
        debug!("Creating new SpeakerStream");
        let mut stream = Self {
            audio_client: None,
            render_client: None,
            h_event: None,
            sample_queue: VecDeque::new(),
            waker_state: Arc::new(Mutex::new(WakerState {
                waker: None,
                has_data: false,
            })),
            initialized: false,
        };

        // macOS처럼 생성자에서 바로 초기화
        if let Err(e) = stream.initialize() {
            error!("Failed to initialize speaker stream: {}", e);
            // 초기화 실패해도 스트림은 생성 (재시도 가능)
        }

        stream
    }

    pub fn sample_rate(&self) -> u32 {
        44100
    }

    fn initialize(&mut self) -> Result<()> {
        debug!("Initializing SpeakerStream");
        if self.initialized {
            return Ok(());
        }

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

        self.audio_client = Some(audio_client);
        self.render_client = Some(render_client);
        self.h_event = Some(h_event);
        self.initialized = true;

        Ok(())
    }

    fn try_read_samples(&mut self) -> Result<()> {
        if !self.initialized {
            self.initialize()?;
        }

        let render_client = self.render_client.as_ref().unwrap();
        let h_event = self.h_event.as_ref().unwrap();

        // 논블로킹으로 이벤트 확인
        if h_event.wait_for_event(3000).is_ok() {
            let mut temp_queue = VecDeque::new();
            render_client.read_from_device_to_deque(&mut temp_queue)?;

            // 바이트를 f32로 변환
            // for chunk in temp_queue.chunks_exact(4) {
            //     if let Ok(bytes) = chunk.try_into() {
            //         let sample = f32::from_le_bytes(bytes);
            //         self.sample_queue.push_back(sample);
            //     }
            // }
            while temp_queue.len() >= 4 {
                let bytes = [
                    temp_queue.pop_front().unwrap(),
                    temp_queue.pop_front().unwrap(),
                    temp_queue.pop_front().unwrap(),
                    temp_queue.pop_front().unwrap(),
                ];
                let sample = f32::from_le_bytes(bytes);
                self.sample_queue.push_back(sample);
            }

            if !self.sample_queue.is_empty() {
                let mut state = self.waker_state.lock().unwrap();
                if !state.has_data {
                    state.has_data = true;
                    if let Some(waker) = state.waker.take() {
                        drop(state);
                        waker.wake();
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
        // 기존 버퍼에서 샘플 확인
        trace!("poll_next");
        if let Some(sample) = self.sample_queue.pop_front() {
            return Poll::Ready(Some(sample));
        }

        // 새로운 데이터 읽기 시도
        if let Err(e) = self.try_read_samples() {
            error!("Failed to read audio samples: {}", e);
            return Poll::Ready(None);
        }

        // 다시 버퍼에서 샘플 확인
        if let Some(sample) = self.sample_queue.pop_front() {
            return Poll::Ready(Some(sample));
        }

        // 데이터가 없으면 waker 등록
        {
            let mut state = self.waker_state.lock().unwrap();
            state.has_data = false;
            state.waker = Some(cx.waker().clone());
        }

        Poll::Pending
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
