use anyhow::{anyhow, Result};
use futures_util::Stream;
use std::collections::VecDeque;
use std::task::Poll;
use std::thread;
use std::time::Duration;
use tracing::{debug, error, trace, warn};
use wasapi::*;

// 폴백 구현을 위한 별도 모듈

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
        // 간단한 검증만 수행
        debug!("Creating SpeakerInput for Windows loopback capture");

        // WASAPI 디바이스 사용 가능성 미리 체크
        match get_default_device(&Direction::Render) {
            Ok(_) => {
                debug!("Default render device available, will attempt WASAPI capture");
            }
            Err(e) => {
                warn!("Default render device not available: {}", e);
                warn!("Will use fallback mode (silence) instead of speaker audio");
            }
        }

        Ok(Self {
            sample_rate_override,
        })
    }

    pub fn stream(self) -> SpeakerStream {
        let (tx, rx) = std::sync::mpsc::sync_channel(32); // 더 큰 버퍼

        let capture_handle = thread::Builder::new()
            .name("WASAPI Loopback Capture".to_string())
            .spawn(move || {
                // 여러 번 재시도
                let mut wasapi_success = false;
                for attempt in 1..=3 {
                    debug!("WASAPI capture attempt {}/3", attempt);
                    match Self::capture_loop_with_retry(tx.clone()) {
                        Ok(_) => {
                            debug!("WASAPI capture completed successfully");
                            wasapi_success = true;
                            break;
                        }
                        Err(e) => {
                            error!("WASAPI capture attempt {} failed: {}", attempt, e);
                            if attempt < 3 {
                                debug!("Waiting before retry...");
                                thread::sleep(Duration::from_millis(1000));
                            }
                        }
                    }
                }

                // 모든 WASAPI 시도가 실패한 경우 폴백 모드
                if !wasapi_success {
                    warn!("=== WASAPI 캡처 실패, 폴백 모드로 전환 ===");
                    warn!("스피커 오디오 대신 무음이 제공됩니다.");
                    warn!("해결 방법:");
                    warn!("1. 관리자 권한으로 프로그램 실행");
                    warn!("2. Windows 오디오 서비스 재시작:");
                    warn!("   net stop audiosrv && net start audiosrv");
                    warn!("3. 다른 오디오 프로그램 종료 (Discord, OBS 등)");
                    warn!("4. 오디오 드라이버 업데이트");

                    Self::fallback_silence_loop(tx);
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

    fn capture_loop_with_retry(tx: std::sync::mpsc::SyncSender<Vec<f32>>) -> Result<()> {
        debug!("Starting WASAPI loopback capture with enhanced error handling");

        // 먼저 기본 렌더 디바이스 확인
        let device = get_default_device(&Direction::Render).map_err(|e| {
            error!("=== WASAPI 오디오 캡처 실패 ===");
            error!("원인: 기본 렌더 디바이스를 가져올 수 없음");
            error!("해결 방법:");
            error!("1. Windows 오디오 서비스 재시작:");
            error!("   - 관리자 권한으로 명령 프롬프트 열기");
            error!("   - 'net stop audiosrv' 실행");
            error!("   - 'net start audiosrv' 실행");
            error!("2. 오디오 드라이버 재설치");
            error!("3. 다른 오디오 프로그램 종료 (Discord, OBS 등)");
            error!("4. 관리자 권한으로 프로그램 실행");
            error!("기술적 에러: {}", e);
            anyhow!("Failed to get default render device: {}", e)
        })?;

        debug!("Successfully obtained default render device");

        // 여러 번의 클라이언트 초기화 시도
        let mut last_error = None;
        for init_attempt in 1..=3 {
            debug!("Audio client initialization attempt {}/3", init_attempt);

            match Self::try_initialize_client(&device) {
                Ok((audio_client, format, capture_client)) => {
                    debug!(
                        "Audio client initialized successfully on attempt {}",
                        init_attempt
                    );
                    return Self::run_capture_loop(tx, audio_client, format, capture_client);
                }
                Err(e) => {
                    last_error = Some(e);
                    error!("Initialization attempt {} failed", init_attempt);
                    if init_attempt < 3 {
                        thread::sleep(Duration::from_millis(500));
                    }
                }
            }
        }

        Err(last_error.unwrap_or_else(|| anyhow!("All initialization attempts failed")))
    }

    fn try_initialize_client(
        device: &Device,
    ) -> Result<(AudioClient, WaveFormat, AudioCaptureClient)> {
        let mut audio_client = device.get_iaudioclient()?;

        // 디바이스의 네이티브 포맷 사용
        let native_format = audio_client.get_mixformat()?;
        debug!("Native format: {:?}", native_format);

        // 디바이스 기간 정보
        let (def_period, min_period) = audio_client.get_device_period()?;
        debug!(
            "Device periods - default: {}ns, minimum: {}ns",
            def_period, min_period
        );

        // 여러 버퍼 크기로 시도
        let buffer_sizes = [
            def_period * 4, // 4배 크기 (가장 안전)
            def_period * 2, // 2배 크기
            def_period,     // 기본 크기
            min_period * 2, // 최소 크기의 2배
        ];

        for (i, buffer_duration) in buffer_sizes.iter().enumerate() {
            debug!(
                "Trying buffer size {}: {}ns ({}ms)",
                i + 1,
                buffer_duration,
                buffer_duration / 10000
            );

            // 새로운 클라이언트 인스턴스 생성 (이전 시도가 실패했을 경우)
            if i > 0 {
                audio_client = device.get_iaudioclient()?;
            }

            let mode = StreamMode::EventsShared {
                autoconvert: true,
                buffer_duration_hns: *buffer_duration,
            };

            match audio_client.initialize_client(&native_format, &Direction::Render, &mode) {
                Ok(_) => {
                    debug!("Successfully initialized with buffer size {}", i + 1);

                    let capture_client = audio_client.get_audiocaptureclient()?;

                    return Ok((audio_client, native_format, capture_client));
                }
                Err(e) => {
                    let error_str = format!("{:?}", e);
                    error!("Buffer size {} failed: {} (error: {})", i + 1, e, error_str);

                    // 특정 에러 코드에 대한 자세한 정보
                    if error_str.contains("0x88890003") {
                        error!("AUDCLNT_E_BUFFER_ERROR - 이것은 보통 다음 중 하나입니다:");
                        error!("1. 다른 애플리케이션이 오디오 디바이스를 독점 사용 중");
                        error!("2. 오디오 드라이버 문제");
                        error!("3. Windows 오디오 서비스 문제");
                        error!("4. 요청한 버퍼 크기가 디바이스에서 지원되지 않음");
                    } else if error_str.contains("0x8889000F") {
                        error!("AUDCLNT_E_DEVICE_IN_USE - 디바이스가 이미 사용 중입니다");
                    } else if error_str.contains("0x88890008") {
                        error!("AUDCLNT_E_UNSUPPORTED_FORMAT - 포맷이 지원되지 않습니다");
                    }
                    continue;
                }
            }
        }

        Err(anyhow!("All buffer size attempts failed"))
    }

    fn run_capture_loop(
        tx: std::sync::mpsc::SyncSender<Vec<f32>>,
        mut audio_client: AudioClient,
        format: WaveFormat,
        capture_client: AudioCaptureClient,
    ) -> Result<()> {
        let channels = format.get_nchannels() as usize;
        let sample_rate = format.get_samplespersec();
        let bits_per_sample = format.get_bitspersample();
        let block_align = format.get_blockalign();

        debug!(
            "Audio format - channels: {}, sample_rate: {}, bits: {}, block_align: {}",
            channels, sample_rate, bits_per_sample, block_align
        );

        let buffer_size = audio_client.get_buffer_size()?;
        debug!("Buffer size: {} frames", buffer_size);

        // 이벤트 핸들 생성
        let event_handle = audio_client.set_get_eventhandle()?;

        // 샘플 큐 초기화 (더 큰 용량)
        let queue_capacity = (block_align as usize) * (buffer_size as usize) * 20;
        let mut sample_queue: VecDeque<u8> = VecDeque::with_capacity(queue_capacity);

        // 스트림 시작
        audio_client.start_stream()?;
        debug!("Audio stream started");

        let chunk_size = 512; // 더 작은 청크 크기
        let bytes_per_frame = block_align as usize;
        let bytes_per_sample = (bits_per_sample / 8) as usize;
        let mut consecutive_errors = 0;
        let max_consecutive_errors = 10;

        loop {
            // 데이터 처리
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
                                    // 다른 포맷 건너뛰기
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
                        trace!("Audio buffer full, dropping chunk");
                    }
                }
            }

            // 디바이스에서 오디오 데이터 읽기
            match capture_client.read_from_device_to_deque(&mut sample_queue) {
                Ok(_) => {
                    consecutive_errors = 0; // 성공 시 에러 카운터 리셋
                    trace!("Successfully read audio data");
                }
                Err(e) => {
                    consecutive_errors += 1;
                    let error_str = format!("{:?}", e);

                    if error_str.contains("0x88890001") {
                        // AUDCLNT_E_BUFFER_EMPTY - 정상적인 상황
                        trace!("Audio buffer empty");
                        consecutive_errors = 0; // 이것은 에러가 아님
                    } else if error_str.contains("0x88890003") {
                        // AUDCLNT_E_BUFFER_ERROR - 버퍼 문제
                        error!("Buffer error detected (attempt {})", consecutive_errors);
                        thread::sleep(Duration::from_millis(50));
                    } else {
                        error!(
                            "Audio capture error: {} (consecutive: {})",
                            e, consecutive_errors
                        );
                    }

                    if consecutive_errors >= max_consecutive_errors {
                        error!("Too many consecutive errors, stopping capture");
                        break;
                    }
                }
            }

            // 이벤트 대기 (더 짧은 타임아웃)
            if event_handle.wait_for_event(1000).is_err() {
                error!("Event wait timeout");
                consecutive_errors += 1;
                if consecutive_errors >= max_consecutive_errors {
                    break;
                }
            }
        }

        // 정리
        debug!("Stopping audio capture");
        let _ = audio_client.stop_stream();
        debug!("Audio capture stopped");

        Ok(())
    }

    fn fallback_silence_loop(tx: std::sync::mpsc::SyncSender<Vec<f32>>) {
        debug!("스피커 오디오 폴백: 무음 생성 시작");

        let chunk_size = 1024;
        let sample_rate = 44100;
        let chunk_duration = Duration::from_secs_f64(chunk_size as f64 / sample_rate as f64);

        loop {
            // 무음 청크 생성 (모두 0.0)
            let silence_chunk = vec![0.0f32; chunk_size];

            if tx.try_send(silence_chunk).is_err() {
                debug!("폴백 오디오 버퍼 가득 차서 청크 드롭");
                // 버퍼가 가득 찬 경우 잠시 대기
                thread::sleep(chunk_duration);
                continue;
            }

            // 실제 오디오 스트림과 비슷한 타이밍 유지
            thread::sleep(chunk_duration);
        }
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
