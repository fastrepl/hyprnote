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
use hypr_audio::{is_using_headphone, AudioInput, DeviceEvent, DeviceMonitor, DeviceMonitorHandle};
use hypr_audio_utils::{chunk_size_for_stt, f32_to_i16_bytes, ResampleExtDynamicNew};
use tauri_specta::Event;

const AUDIO_AMPLITUDE_THROTTLE: Duration = Duration::from_millis(100);

pub enum SourceMsg {
    SetMicMute(bool),
    GetMicMute(RpcReplyPort<bool>),
    SetMicDevice(Option<String>),
    GetMicDevice(RpcReplyPort<Option<String>>),
    GetMode(RpcReplyPort<ChannelMode>),
    MicChunk(AudioChunk),
    SpeakerChunk(AudioChunk),
}

pub struct SourceArgs {
    pub mic_device: Option<String>,
    pub token: CancellationToken,
    pub onboarding: bool,
    pub app: tauri::AppHandle,
    pub session_id: String,
}

pub struct SourceState {
    mic_device: Option<String>,
    token: CancellationToken,
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
                Ok(DeviceEvent::DefaultInputChanged { .. })
                | Ok(DeviceEvent::DefaultOutputChanged { .. }) => {
                    tracing::info!(event = ?event, "device_event");
                    pending_change = true;
                }
                Err(RecvTimeoutError::Timeout) => {
                    if pending_change {
                        let new_device = AudioInput::get_default_device_name();
                        let _ = actor.cast(SourceMsg::SetMicDevice(Some(new_device)));
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
            mic_device,
            token: args.token,
            onboarding: args.onboarding,
            mic_muted: Arc::new(AtomicBool::new(false)),
            run_task: None,
            stream_cancel_token: None,
            _device_watcher: Some(device_watcher),
            _silence_stream_tx: silence_stream_tx,
            current_mode: ChannelMode::Dual,
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
            SourceMsg::SetMicDevice(dev) => {
                st.mic_device = dev;
                st.pipeline.reset();

                if let Some(cancel_token) = st.stream_cancel_token.take() {
                    cancel_token.cancel();
                }

                if let Some(task) = st.run_task.take() {
                    task.abort();
                }
                start_source_loop(&myself, st).await?;
            }
            SourceMsg::GetMode(reply) => {
                if !reply.is_closed() {
                    let _ = reply.send(st.current_mode);
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
    let myself2 = myself.clone();
    let token = st.token.clone();
    let mic_muted = st.mic_muted.clone();
    let mic_device = st.mic_device.clone();

    let stream_cancel_token = CancellationToken::new();
    st.stream_cancel_token = Some(stream_cancel_token.clone());

    #[cfg(any(target_os = "macos", target_os = "linux"))]
    let new_mode = if !st.onboarding && !is_using_headphone() {
        ChannelMode::Single
    } else {
        ChannelMode::Dual
    };

    #[cfg(not(any(target_os = "macos", target_os = "linux")))]
    let new_mode = ChannelMode::Dual;

    let mode_changed = st.current_mode != new_mode;
    st.current_mode = new_mode;

    tracing::info!(?new_mode, mode_changed, "start_source_loop");

    st.pipeline.reset();

    if mode_changed {
        if let Some(cell) = registry::where_is(ListenerActor::name()) {
            let actor: ActorRef<ListenerMsg> = cell.into();
            let _ = actor.cast(ListenerMsg::ChangeMode(new_mode));
        }
    }

    #[cfg(not(any(target_os = "macos", target_os = "linux")))]
    if new_mode == ChannelMode::Single {
        st.run_task = Some(tokio::spawn(async move {}));
        return Ok(());
    }

    let handle = tokio::spawn(async move {
        let mic_stream = {
            let mut mic_input = AudioInput::from_mic(mic_device.clone()).unwrap();
            let chunk_size = chunk_size_for_stt(super::SAMPLE_RATE);
            mic_input
                .stream()
                .resampled_chunks(super::SAMPLE_RATE, chunk_size)
                .unwrap()
        };
        tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
        let spk_stream = {
            let mut spk_input = hypr_audio::AudioInput::from_speaker();
            let chunk_size = chunk_size_for_stt(super::SAMPLE_RATE);
            spk_input
                .stream()
                .resampled_chunks(super::SAMPLE_RATE, chunk_size)
                .unwrap()
        };

        tokio::pin!(mic_stream);
        tokio::pin!(spk_stream);

        loop {
            tokio::select! {
                _ = token.cancelled() => {
                    drop(mic_stream);
                    drop(spk_stream);
                    myself2.stop(None);
                    return;
                }
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
                        }
                    }
                    Some(Err(err)) => {
                        tracing::warn!(error = ?err, "mic_resample_failed");
                    }
                    None => break,
                },
                spk_next = spk_stream.next() => match spk_next {
                    Some(Ok(data)) => {
                        if myself2.cast(SourceMsg::SpeakerChunk(AudioChunk { data })).is_err() {
                            tracing::warn!("failed_to_cast_speaker_chunk");
                        }
                    }
                    Some(Err(err)) => {
                        tracing::warn!(error = ?err, "speaker_resample_failed");
                    }
                    None => break,
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
}

impl Pipeline {
    fn new(app: tauri::AppHandle, session_id: String) -> Self {
        Self {
            agc_mic: VadAgc::default(),
            agc_spk: VadAgc::default(),
            aec: None,
            joiner: Joiner::new(),
            amplitude: AmplitudeEmitter::new(app, session_id),
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
    }

    fn ingest_mic(&mut self, chunk: AudioChunk) {
        let mut data = chunk.data;
        self.agc_mic.process_with_gate(&mut data);
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
            let result = if mode == ChannelMode::Single {
                actor.cast(RecMsg::AudioSingle(Arc::clone(&processed_mic)))
            } else {
                actor.cast(RecMsg::AudioDual(
                    Arc::clone(&processed_mic),
                    Arc::clone(&processed_spk),
                ))
            };
            if let Err(e) = result {
                tracing::error!(error = ?e, "failed_to_send_audio_to_recorder");
            }
        }

        let Some(cell) = registry::where_is(ListenerActor::name()) else {
            tracing::debug!(actor = ListenerActor::name(), "unavailable");
            return;
        };

        let actor: ActorRef<ListenerMsg> = cell.into();

        let result = if mode == ChannelMode::Single {
            let audio_bytes = f32_to_i16_bytes(processed_mic.to_vec().iter().copied());
            actor.cast(ListenerMsg::AudioSingle(audio_bytes))
        } else {
            let mic_bytes = f32_to_i16_bytes(processed_mic.iter().copied());
            let spk_bytes = f32_to_i16_bytes(processed_spk.iter().copied());
            actor.cast(ListenerMsg::AudioDual(mic_bytes, spk_bytes))
        };

        if result.is_err() {
            tracing::warn!(actor = ListenerActor::name(), "cast_failed");
            return;
        }

        self.amplitude.observe(processed_mic, processed_spk);
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

        if self.should_use_silence_for_speaker(mode) {
            let mic = self.mic.pop_front()?;
            let spk = self.get_silence(mic.len());
            return Some((mic, spk));
        }

        if self.should_use_silence_for_mic() {
            let spk = self.spk.pop_front()?;
            let mic = self.get_silence(spk.len());
            return Some((mic, spk));
        }

        None
    }

    fn should_use_silence_for_speaker(&self, mode: ChannelMode) -> bool {
        self.mic.front().is_some()
            && self.spk.is_empty()
            && (mode == ChannelMode::Single || self.mic.len() > Self::MAX_LAG)
    }

    fn should_use_silence_for_mic(&self) -> bool {
        self.spk.front().is_some() && self.mic.is_empty() && self.spk.len() > Self::MAX_LAG
    }
}
