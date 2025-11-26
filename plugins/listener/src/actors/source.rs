use std::{
    collections::{HashMap, VecDeque},
    sync::{
        atomic::{AtomicBool, Ordering},
        mpsc::{self, Receiver},
        Arc,
    },
    time::{Duration, Instant},
};

use futures_util::StreamExt;
use ractor::{registry, Actor, ActorName, ActorProcessingErr, ActorRef, RpcReplyPort};
use tokio_util::sync::CancellationToken;

use crate::{
    actors::{AudioChunk, ChannelMode, ListenerActor, ListenerMsg, RecMsg, RecorderActor},
    SessionEvent,
};
use hypr_aec::AEC;
use hypr_agc::VadAgc;
use hypr_audio::{AudioInput, DeviceEvent, DeviceMonitor, DeviceMonitorHandle};
use hypr_audio_utils::{chunk_size_for_stt, f32_to_i16_bytes, ResampleExtDynamicNew};
use hypr_vad_ext::VadMaskExt;
use tauri_specta::Event;

const AUDIO_AMPLITUDE_THROTTLE: Duration = Duration::from_millis(100);
const MAX_BUFFER_CHUNKS: usize = 150;

pub enum SourceMsg {
    SetMicMute(bool),
    GetMicMute(RpcReplyPort<bool>),
    GetMicDevice(RpcReplyPort<Option<String>>),
    GetSessionId(RpcReplyPort<String>),
    MicChunk(AudioChunk),
    SpeakerChunk(AudioChunk),
    StreamFailed(String),
}

pub struct SourceArgs {
    pub mic_device: Option<String>,
    pub onboarding: bool,
    pub app: tauri::AppHandle,
    pub session_id: String,
}

pub struct SourceState {
    session_id: String,
    mic_device: Option<String>,
    onboarding: bool,
    mic_muted: Arc<AtomicBool>,
    run_task: Option<tokio::task::JoinHandle<()>>,
    stream_cancel_token: Option<CancellationToken>,
    _device_watcher: Option<DeviceChangeWatcher>,
    _silence_stream_tx: Option<std::sync::mpsc::Sender<()>>,
    current_mode: ChannelMode,
    pipeline: Pipeline,
}

pub struct SourceActor;

struct DeviceChangeWatcher {
    _handle: DeviceMonitorHandle,
    _thread: std::thread::JoinHandle<()>,
}

impl DeviceChangeWatcher {
    fn spawn(actor: ActorRef<SourceMsg>) -> Self {
        let (event_tx, event_rx) = mpsc::channel();
        let handle = DeviceMonitor::spawn(event_tx);
        let thread = std::thread::spawn(move || Self::event_loop(event_rx, actor));

        Self {
            _handle: handle,
            _thread: thread,
        }
    }

    fn event_loop(event_rx: Receiver<DeviceEvent>, actor: ActorRef<SourceMsg>) {
        use std::sync::mpsc::RecvTimeoutError;

        let debounce_duration = Duration::from_millis(1000);
        let mut pending_change = false;

        loop {
            let event = if pending_change {
                event_rx.recv_timeout(debounce_duration)
            } else {
                event_rx.recv().map_err(|_| RecvTimeoutError::Disconnected)
            };

            match event {
                Ok(DeviceEvent::DefaultInputChanged)
                | Ok(DeviceEvent::DefaultOutputChanged { .. }) => {
                    tracing::info!(event = ?event, "device_event");
                    pending_change = true;
                }
                Err(RecvTimeoutError::Timeout) => {
                    if pending_change {
                        tracing::info!("device_change_debounced_restarting_source");
                        actor.stop(Some("device_change".to_string()));
                        pending_change = false;
                    }
                }
                Err(RecvTimeoutError::Disconnected) => break,
            }
        }
    }
}

impl SourceActor {
    pub fn name() -> ActorName {
        "source".into()
    }
}

#[ractor::async_trait]
impl Actor for SourceActor {
    type Msg = SourceMsg;
    type State = SourceState;
    type Arguments = SourceArgs;

    async fn pre_start(
        &self,
        myself: ActorRef<Self::Msg>,
        args: Self::Arguments,
    ) -> Result<Self::State, ActorProcessingErr> {
        let device_watcher = DeviceChangeWatcher::spawn(myself.clone());

        let silence_stream_tx = Some(hypr_audio::AudioOutput::silence());
        let mic_device = args
            .mic_device
            .or_else(|| Some(AudioInput::get_default_device_name()));
        tracing::info!(mic_device = ?mic_device);

        let pipeline = Pipeline::new(args.app.clone(), args.session_id.clone());

        let mut st = SourceState {
            session_id: args.session_id,
            mic_device,
            onboarding: args.onboarding,
            mic_muted: Arc::new(AtomicBool::new(false)),
            run_task: None,
            stream_cancel_token: None,
            _device_watcher: Some(device_watcher),
            _silence_stream_tx: silence_stream_tx,
            current_mode: ChannelMode::MicAndSpeaker,
            pipeline,
        };

        start_source_loop(&myself, &mut st).await?;
        Ok(st)
    }

    async fn handle(
        &self,
        myself: ActorRef<Self::Msg>,
        msg: Self::Msg,
        st: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        match msg {
            SourceMsg::SetMicMute(muted) => {
                st.mic_muted.store(muted, Ordering::Relaxed);
            }
            SourceMsg::GetMicMute(reply) => {
                if !reply.is_closed() {
                    let _ = reply.send(st.mic_muted.load(Ordering::Relaxed));
                }
            }
            SourceMsg::GetMicDevice(reply) => {
                if !reply.is_closed() {
                    let _ = reply.send(st.mic_device.clone());
                }
            }
            SourceMsg::GetSessionId(reply) => {
                if !reply.is_closed() {
                    let _ = reply.send(st.session_id.clone());
                }
            }
            SourceMsg::MicChunk(chunk) => {
                st.pipeline.ingest_mic(chunk);
                st.pipeline.flush(st.current_mode);
            }
            SourceMsg::SpeakerChunk(chunk) => {
                st.pipeline.ingest_speaker(chunk);
                st.pipeline.flush(st.current_mode);
            }
            SourceMsg::StreamFailed(reason) => {
                tracing::error!(%reason, "source_stream_failed_stopping");
                myself.stop(Some(reason));
            }
        }

        Ok(())
    }

    async fn post_stop(
        &self,
        _myself: ActorRef<Self::Msg>,
        st: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        if let Some(cancel_token) = st.stream_cancel_token.take() {
            cancel_token.cancel();
        }
        if let Some(task) = st.run_task.take() {
            task.abort();
        }

        Ok(())
    }
}

async fn start_source_loop(
    myself: &ActorRef<SourceMsg>,
    st: &mut SourceState,
) -> Result<(), ActorProcessingErr> {
    let new_mode = ChannelMode::determine(st.onboarding);

    let mode_changed = st.current_mode != new_mode;
    st.current_mode = new_mode;

    tracing::info!(?new_mode, mode_changed, "start_source_loop");

    st.pipeline.reset();

    match new_mode {
        ChannelMode::MicOnly => start_source_loop_mic_only(myself, st).await,
        ChannelMode::SpeakerOnly => start_source_loop_speaker_only(myself, st).await,
        ChannelMode::MicAndSpeaker => start_source_loop_mic_and_speaker(myself, st).await,
    }
}

async fn start_source_loop_mic_only(
    myself: &ActorRef<SourceMsg>,
    st: &mut SourceState,
) -> Result<(), ActorProcessingErr> {
    #[cfg(not(any(target_os = "macos", target_os = "linux")))]
    {
        st.run_task = Some(tokio::spawn(async move {}));
        return Ok(());
    }

    #[cfg(any(target_os = "macos", target_os = "linux"))]
    {
        let myself2 = myself.clone();
        let mic_muted = st.mic_muted.clone();
        let mic_device = st.mic_device.clone();

        let stream_cancel_token = CancellationToken::new();
        st.stream_cancel_token = Some(stream_cancel_token.clone());

        let handle = tokio::spawn(async move {
            let mic_stream = {
                let mut mic_input = match AudioInput::from_mic(mic_device.clone()) {
                    Ok(input) => input,
                    Err(err) => {
                        tracing::error!(error = ?err, device = ?mic_device, "mic_open_failed");
                        let _ = myself2.cast(SourceMsg::StreamFailed("mic_open_failed".into()));
                        return;
                    }
                };

                let chunk_size = chunk_size_for_stt(super::SAMPLE_RATE);
                match mic_input
                    .stream()
                    .resampled_chunks(super::SAMPLE_RATE, chunk_size)
                {
                    Ok(stream) => stream,
                    Err(err) => {
                        tracing::error!(error = ?err, device = ?mic_device, "mic_stream_setup_failed");
                        let _ =
                            myself2.cast(SourceMsg::StreamFailed("mic_stream_setup_failed".into()));
                        return;
                    }
                }
            };

            tokio::pin!(mic_stream);

            loop {
                tokio::select! {
                    _ = stream_cancel_token.cancelled() => {
                        drop(mic_stream);
                        return;
                    }
                    mic_next = mic_stream.next() => match mic_next {
                        Some(Ok(data)) => {
                            let output_data = if mic_muted.load(Ordering::Relaxed) {
                                vec![0.0; data.len()]
                            } else {
                                data
                            };
                            if myself2.cast(SourceMsg::MicChunk(AudioChunk { data: output_data })).is_err() {
                                tracing::warn!("failed_to_cast_mic_chunk");
                                return;
                            }
                        }
                        Some(Err(err)) => {
                            tracing::error!(error = ?err, device = ?mic_device, "mic_resample_failed");
                            let _ = myself2.cast(SourceMsg::StreamFailed("mic_resample_failed".into()));
                            return;
                        }
                        None => {
                            tracing::error!(device = ?mic_device, "mic_stream_ended");
                            let _ = myself2.cast(SourceMsg::StreamFailed("mic_stream_ended".into()));
                            return;
                        }
                    },
                }
            }
        });

        st.run_task = Some(handle);
        Ok(())
    }
}

async fn start_source_loop_speaker_only(
    myself: &ActorRef<SourceMsg>,
    st: &mut SourceState,
) -> Result<(), ActorProcessingErr> {
    let myself2 = myself.clone();

    let stream_cancel_token = CancellationToken::new();
    st.stream_cancel_token = Some(stream_cancel_token.clone());

    let handle = tokio::spawn(async move {
        let spk_stream = {
            let mut spk_input = hypr_audio::AudioInput::from_speaker();
            let chunk_size = chunk_size_for_stt(super::SAMPLE_RATE);
            let spk_stream_res = spk_input
                .stream()
                .resampled_chunks(super::SAMPLE_RATE, chunk_size);

            match spk_stream_res {
                Ok(stream) => stream,
                Err(err) => {
                    tracing::error!(error = ?err, "speaker_stream_setup_failed");
                    let _ = myself2.cast(SourceMsg::StreamFailed(
                        "speaker_stream_setup_failed".into(),
                    ));
                    return;
                }
            }
        };

        tokio::pin!(spk_stream);

        loop {
            tokio::select! {
                _ = stream_cancel_token.cancelled() => {
                    drop(spk_stream);
                    return;
                }
                spk_next = spk_stream.next() => match spk_next {
                    Some(Ok(data)) => {
                        if myself2.cast(SourceMsg::SpeakerChunk(AudioChunk { data })).is_err() {
                            tracing::warn!("failed_to_cast_speaker_chunk");
                            return;
                        }
                    }
                    Some(Err(err)) => {
                        tracing::error!(error = ?err, "speaker_resample_failed");
                        let _ = myself2.cast(SourceMsg::StreamFailed("speaker_resample_failed".into()));
                        return;
                    }
                    None => {
                        tracing::error!("speaker_stream_ended");
                        let _ = myself2.cast(SourceMsg::StreamFailed("speaker_stream_ended".into()));
                        return;
                    }
                },
            }
        }
    });

    st.run_task = Some(handle);
    Ok(())
}

async fn start_source_loop_mic_and_speaker(
    myself: &ActorRef<SourceMsg>,
    st: &mut SourceState,
) -> Result<(), ActorProcessingErr> {
    let myself2 = myself.clone();
    let mic_muted = st.mic_muted.clone();
    let mic_device = st.mic_device.clone();

    let stream_cancel_token = CancellationToken::new();
    st.stream_cancel_token = Some(stream_cancel_token.clone());

    let handle = tokio::spawn(async move {
        let mic_stream = {
            let mut mic_input = match AudioInput::from_mic(mic_device.clone()) {
                Ok(input) => input,
                Err(err) => {
                    tracing::error!(error = ?err, device = ?mic_device, "mic_open_failed");
                    let _ = myself2.cast(SourceMsg::StreamFailed("mic_open_failed".into()));
                    return;
                }
            };

            let chunk_size = chunk_size_for_stt(super::SAMPLE_RATE);
            let mic_stream_res = mic_input
                .stream()
                .resampled_chunks(super::SAMPLE_RATE, chunk_size);

            match mic_stream_res {
                Ok(stream) => stream.mask_with_vad(),
                Err(err) => {
                    tracing::error!(error = ?err, device = ?mic_device, "mic_stream_setup_failed");
                    let _ = myself2.cast(SourceMsg::StreamFailed("mic_stream_setup_failed".into()));
                    return;
                }
            }
        };

        tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;

        let spk_stream = {
            let mut spk_input = hypr_audio::AudioInput::from_speaker();
            let chunk_size = chunk_size_for_stt(super::SAMPLE_RATE);
            let spk_stream_res = spk_input
                .stream()
                .resampled_chunks(super::SAMPLE_RATE, chunk_size);

            match spk_stream_res {
                Ok(stream) => stream,
                Err(err) => {
                    tracing::error!(error = ?err, "speaker_stream_setup_failed");
                    let _ = myself2.cast(SourceMsg::StreamFailed(
                        "speaker_stream_setup_failed".into(),
                    ));
                    return;
                }
            }
        };

        tokio::pin!(mic_stream);
        tokio::pin!(spk_stream);

        loop {
            tokio::select! {
                _ = stream_cancel_token.cancelled() => {
                    drop(mic_stream);
                    drop(spk_stream);
                    return;
                }
                mic_next = mic_stream.next() => match mic_next {
                    Some(Ok(data)) => {
                        let output_data = if mic_muted.load(Ordering::Relaxed) {
                            vec![0.0; data.len()]
                        } else {
                            data
                        };
                        if myself2.cast(SourceMsg::MicChunk(AudioChunk { data: output_data })).is_err() {
                            tracing::warn!("failed_to_cast_mic_chunk");
                            return;
                        }
                    }
                    Some(Err(err)) => {
                        tracing::error!(error = ?err, device = ?mic_device, "mic_resample_failed");
                        let _ = myself2.cast(SourceMsg::StreamFailed("mic_resample_failed".into()));
                        return;
                    }
                    None => {
                        tracing::error!(device = ?mic_device, "mic_stream_ended");
                        let _ = myself2.cast(SourceMsg::StreamFailed("mic_stream_ended".into()));
                        return;
                    }
                },
                spk_next = spk_stream.next() => match spk_next {
                    Some(Ok(data)) => {
                        if myself2.cast(SourceMsg::SpeakerChunk(AudioChunk { data })).is_err() {
                            tracing::warn!("failed_to_cast_speaker_chunk");
                            return;
                        }
                    }
                    Some(Err(err)) => {
                        tracing::error!(error = ?err, "speaker_resample_failed");
                        let _ = myself2.cast(SourceMsg::StreamFailed("speaker_resample_failed".into()));
                        return;
                    }
                    None => {
                        tracing::error!("speaker_stream_ended");
                        let _ = myself2.cast(SourceMsg::StreamFailed("speaker_stream_ended".into()));
                        return;
                    }
                },
            }
        }
    });

    st.run_task = Some(handle);
    Ok(())
}

struct Pipeline {
    agc_mic: VadAgc,
    agc_spk: VadAgc,
    aec: Option<AEC>,
    joiner: Joiner,
    amplitude: AmplitudeEmitter,
    audio_buffer: AudioBuffer,
    backlog_quota: f32,
}

impl Pipeline {
    const BACKLOG_QUOTA_INCREMENT: f32 = 0.25;
    const MAX_BACKLOG_QUOTA: f32 = 2.0;

    fn new(app: tauri::AppHandle, session_id: String) -> Self {
        Self {
            agc_mic: VadAgc::default(),
            agc_spk: VadAgc::default(),
            aec: None,
            joiner: Joiner::new(),
            amplitude: AmplitudeEmitter::new(app, session_id),
            audio_buffer: AudioBuffer::new(MAX_BUFFER_CHUNKS),
            backlog_quota: 0.0,
        }
    }

    fn reset(&mut self) {
        self.joiner.reset();
        self.agc_mic = VadAgc::default();
        self.agc_spk = VadAgc::default();
        if let Some(aec) = &mut self.aec {
            aec.reset();
        }
        self.amplitude.reset();
        self.audio_buffer.clear();
        self.backlog_quota = 0.0;
    }

    fn ingest_mic(&mut self, chunk: AudioChunk) {
        let mut data = chunk.data;
        self.agc_mic.process(&mut data);
        let arc = Arc::<[f32]>::from(data);
        self.joiner.push_mic(arc);
    }

    fn ingest_speaker(&mut self, chunk: AudioChunk) {
        let mut data = chunk.data;
        self.agc_spk.process(&mut data);
        let arc = Arc::<[f32]>::from(data);
        self.joiner.push_spk(arc);
    }

    fn flush(&mut self, mode: ChannelMode) {
        while let Some((mic, spk)) = self.joiner.pop_pair(mode) {
            self.dispatch(mic, spk, mode);
        }
    }

    fn dispatch(&mut self, mic: Arc<[f32]>, spk: Arc<[f32]>, mode: ChannelMode) {
        let (processed_mic, processed_spk) = if let Some(aec) = &mut self.aec {
            match aec.process_streaming(&mic, &spk) {
                Ok(processed) => {
                    let processed_arc = Arc::<[f32]>::from(processed);
                    (processed_arc, Arc::clone(&spk))
                }
                Err(e) => {
                    tracing::warn!(error = ?e, "aec_failed");
                    (mic, spk)
                }
            }
        } else {
            (mic, spk)
        };

        if let Some(cell) = registry::where_is(RecorderActor::name()) {
            let actor: ActorRef<RecMsg> = cell.into();
            let result = match mode {
                ChannelMode::MicOnly => actor.cast(RecMsg::AudioSingle(Arc::clone(&processed_mic))),
                ChannelMode::SpeakerOnly => {
                    actor.cast(RecMsg::AudioSingle(Arc::clone(&processed_spk)))
                }
                ChannelMode::MicAndSpeaker => actor.cast(RecMsg::AudioDual(
                    Arc::clone(&processed_mic),
                    Arc::clone(&processed_spk),
                )),
            };
            if let Err(e) = result {
                tracing::error!(error = ?e, "failed_to_send_audio_to_recorder");
            }
        }

        self.amplitude
            .observe(Arc::clone(&processed_mic), Arc::clone(&processed_spk));

        let Some(cell) = registry::where_is(ListenerActor::name()) else {
            self.audio_buffer.push(processed_mic, processed_spk, mode);
            tracing::debug!(
                actor = ListenerActor::name(),
                buffered = self.audio_buffer.len(),
                "listener_unavailable_buffering"
            );
            return;
        };

        let actor: ActorRef<ListenerMsg> = cell.into();

        self.flush_buffer_to_listener(&actor, mode);

        self.send_to_listener(&actor, &processed_mic, &processed_spk, mode);
    }

    fn flush_buffer_to_listener(&mut self, actor: &ActorRef<ListenerMsg>, mode: ChannelMode) {
        if !self.audio_buffer.is_empty() {
            self.backlog_quota =
                (self.backlog_quota + Self::BACKLOG_QUOTA_INCREMENT).min(Self::MAX_BACKLOG_QUOTA);

            while self.backlog_quota >= 1.0 {
                let Some((mic, spk, buffered_mode)) = self.audio_buffer.pop() else {
                    break;
                };

                if buffered_mode == mode {
                    self.send_to_listener(actor, &mic, &spk, mode);
                    self.backlog_quota -= 1.0;
                }
            }
        }
    }

    fn send_to_listener(
        &self,
        actor: &ActorRef<ListenerMsg>,
        mic: &Arc<[f32]>,
        spk: &Arc<[f32]>,
        mode: ChannelMode,
    ) {
        let result = match mode {
            ChannelMode::MicOnly => {
                let bytes = f32_to_i16_bytes(mic.iter().copied());
                actor.cast(ListenerMsg::AudioSingle(bytes))
            }
            ChannelMode::SpeakerOnly => {
                let bytes = f32_to_i16_bytes(spk.iter().copied());
                actor.cast(ListenerMsg::AudioSingle(bytes))
            }
            ChannelMode::MicAndSpeaker => {
                let mic_bytes = f32_to_i16_bytes(mic.iter().copied());
                let spk_bytes = f32_to_i16_bytes(spk.iter().copied());
                actor.cast(ListenerMsg::AudioDual(mic_bytes, spk_bytes))
            }
        };

        if result.is_err() {
            tracing::warn!(actor = ListenerActor::name(), "cast_failed");
        }
    }
}

struct AudioBuffer {
    buffer: VecDeque<(Arc<[f32]>, Arc<[f32]>, ChannelMode)>,
    max_size: usize,
}

impl AudioBuffer {
    fn new(max_size: usize) -> Self {
        Self {
            buffer: VecDeque::new(),
            max_size,
        }
    }

    fn push(&mut self, mic: Arc<[f32]>, spk: Arc<[f32]>, mode: ChannelMode) {
        if self.buffer.len() >= self.max_size {
            self.buffer.pop_front();
            tracing::warn!("audio_buffer_overflow");
        }
        self.buffer.push_back((mic, spk, mode));
    }

    fn pop(&mut self) -> Option<(Arc<[f32]>, Arc<[f32]>, ChannelMode)> {
        self.buffer.pop_front()
    }

    fn len(&self) -> usize {
        self.buffer.len()
    }

    fn is_empty(&self) -> bool {
        self.buffer.is_empty()
    }

    fn clear(&mut self) {
        self.buffer.clear();
    }
}

struct AmplitudeEmitter {
    app: tauri::AppHandle,
    session_id: String,
    last_mic: Option<Arc<[f32]>>,
    last_spk: Option<Arc<[f32]>>,
    last_emit: Instant,
}

impl AmplitudeEmitter {
    fn new(app: tauri::AppHandle, session_id: String) -> Self {
        Self {
            app,
            session_id,
            last_mic: None,
            last_spk: None,
            last_emit: Instant::now(),
        }
    }

    fn reset(&mut self) {
        self.last_mic = None;
        self.last_spk = None;
        self.last_emit = Instant::now();
    }

    fn observe(&mut self, mic: Arc<[f32]>, spk: Arc<[f32]>) {
        self.last_mic = Some(mic);
        self.last_spk = Some(spk);
        self.emit_if_ready();
    }

    fn emit_if_ready(&mut self) {
        if self.last_emit.elapsed() < AUDIO_AMPLITUDE_THROTTLE {
            return;
        }

        let (Some(mic), Some(spk)) = (&self.last_mic, &self.last_spk) else {
            return;
        };

        let mic_level = Self::amplitude_from_chunk(mic.as_ref());
        let spk_level = Self::amplitude_from_chunk(spk.as_ref());

        if let Err(error) = (SessionEvent::AudioAmplitude {
            session_id: self.session_id.clone(),
            mic: mic_level,
            speaker: spk_level,
        })
        .emit(&self.app)
        {
            tracing::error!(error = ?error, "session_event_emit_failed");
        }

        self.last_emit = Instant::now();
    }

    fn amplitude_from_chunk(chunk: &[f32]) -> u16 {
        (chunk
            .iter()
            .map(|&x| x.abs())
            .filter(|x| x.is_finite())
            .max_by(|a, b| a.partial_cmp(b).unwrap())
            .unwrap_or(0.0)
            * 100.0) as u16
    }
}

struct Joiner {
    mic: VecDeque<Arc<[f32]>>,
    spk: VecDeque<Arc<[f32]>>,
    silence_cache: HashMap<usize, Arc<[f32]>>,
}

impl Joiner {
    const MAX_LAG: usize = 4;
    const MAX_QUEUE_SIZE: usize = 30;

    fn new() -> Self {
        Self {
            mic: VecDeque::new(),
            spk: VecDeque::new(),
            silence_cache: HashMap::new(),
        }
    }

    fn reset(&mut self) {
        self.mic.clear();
        self.spk.clear();
    }

    fn get_silence(&mut self, len: usize) -> Arc<[f32]> {
        self.silence_cache
            .entry(len)
            .or_insert_with(|| Arc::from(vec![0.0; len]))
            .clone()
    }

    fn push_mic(&mut self, data: Arc<[f32]>) {
        self.mic.push_back(data);
        if self.mic.len() > Self::MAX_QUEUE_SIZE {
            tracing::warn!("mic_queue_overflow");
            self.mic.pop_front();
        }
    }

    fn push_spk(&mut self, data: Arc<[f32]>) {
        self.spk.push_back(data);
        if self.spk.len() > Self::MAX_QUEUE_SIZE {
            tracing::warn!("spk_queue_overflow");
            self.spk.pop_front();
        }
    }

    fn pop_pair(&mut self, mode: ChannelMode) -> Option<(Arc<[f32]>, Arc<[f32]>)> {
        if self.mic.front().is_some() && self.spk.front().is_some() {
            return Some((self.mic.pop_front()?, self.spk.pop_front()?));
        }

        match mode {
            ChannelMode::MicOnly => {
                if let Some(mic) = self.mic.pop_front() {
                    let spk = self.get_silence(mic.len());
                    return Some((mic, spk));
                }
            }
            ChannelMode::SpeakerOnly => {
                if let Some(spk) = self.spk.pop_front() {
                    let mic = self.get_silence(spk.len());
                    return Some((mic, spk));
                }
            }
            ChannelMode::MicAndSpeaker => {
                if self.mic.front().is_some()
                    && self.spk.is_empty()
                    && self.mic.len() > Self::MAX_LAG
                {
                    let mic = self.mic.pop_front()?;
                    let spk = self.get_silence(mic.len());
                    return Some((mic, spk));
                }
                if self.spk.front().is_some()
                    && self.mic.is_empty()
                    && self.spk.len() > Self::MAX_LAG
                {
                    let spk = self.spk.pop_front()?;
                    let mic = self.get_silence(spk.len());
                    return Some((mic, spk));
                }
            }
        }

        None
    }
}
