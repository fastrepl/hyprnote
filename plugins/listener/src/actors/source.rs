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
use hypr_audio::{
    is_using_headphone, AudioInputProvider, AudioStreamProvider, DeviceEvent, DeviceMonitorHandle,
    DeviceMonitorProvider,
};
use hypr_audio_utils::{chunk_size_for_stt, f32_to_i16_bytes, ResampleExtDynamicNew};
use hypr_vad_ext::VadMaskExt;
use tauri_specta::Event;

const AUDIO_AMPLITUDE_THROTTLE: Duration = Duration::from_millis(100);
const MAX_BUFFER_CHUNKS: usize = 150;

pub trait EventEmitter: Send + Sync + 'static {
    fn emit_audio_amplitude(
        &self,
        session_id: &str,
        mic: u16,
        speaker: u16,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>>;
}

pub trait ActorRegistry: Send + Sync + 'static {
    fn find_listener(&self) -> Option<ActorRef<ListenerMsg>>;
    fn find_recorder(&self) -> Option<ActorRef<RecMsg>>;
}

pub trait AudioProcessor: Send + Sync + 'static {
    fn process_mic(&mut self, data: &mut [f32]);
    fn process_speaker(&mut self, data: &mut [f32]);
    fn process_aec(
        &mut self,
        mic: &[f32],
        spk: &[f32],
    ) -> Result<Vec<f32>, Box<dyn std::error::Error + Send + Sync>>;
    fn reset(&mut self);
}

pub struct TauriEventEmitter {
    app: tauri::AppHandle,
}

impl TauriEventEmitter {
    pub fn new(app: tauri::AppHandle) -> Self {
        Self { app }
    }
}

impl EventEmitter for TauriEventEmitter {
    fn emit_audio_amplitude(
        &self,
        session_id: &str,
        mic: u16,
        speaker: u16,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        SessionEvent::AudioAmplitude {
            session_id: session_id.to_string(),
            mic,
            speaker,
        }
        .emit(&self.app)
        .map_err(|e| Box::new(e) as Box<dyn std::error::Error + Send + Sync>)
    }
}

pub struct RactorActorRegistry;

impl ActorRegistry for RactorActorRegistry {
    fn find_listener(&self) -> Option<ActorRef<ListenerMsg>> {
        registry::where_is(ListenerActor::name()).map(|cell| cell.into())
    }

    fn find_recorder(&self) -> Option<ActorRef<RecMsg>> {
        registry::where_is(RecorderActor::name()).map(|cell| cell.into())
    }
}

pub struct DefaultAudioProcessor {
    agc_mic: VadAgc,
    agc_spk: VadAgc,
    aec: Option<AEC>,
}

impl Default for DefaultAudioProcessor {
    fn default() -> Self {
        Self {
            agc_mic: VadAgc::default(),
            agc_spk: VadAgc::default(),
            aec: None,
        }
    }
}

impl DefaultAudioProcessor {
    pub fn with_aec(mut self) -> Self {
        self.aec = AEC::new().ok();
        self
    }
}

impl AudioProcessor for DefaultAudioProcessor {
    fn process_mic(&mut self, data: &mut [f32]) {
        self.agc_mic.process(data);
    }

    fn process_speaker(&mut self, data: &mut [f32]) {
        self.agc_spk.process(data);
    }

    fn process_aec(
        &mut self,
        mic: &[f32],
        spk: &[f32],
    ) -> Result<Vec<f32>, Box<dyn std::error::Error + Send + Sync>> {
        if let Some(aec) = &mut self.aec {
            aec.process_streaming(mic, spk)
                .map_err(|e| Box::new(e) as Box<dyn std::error::Error + Send + Sync>)
        } else {
            Ok(mic.to_vec())
        }
    }

    fn reset(&mut self) {
        self.agc_mic = VadAgc::default();
        self.agc_spk = VadAgc::default();
        if let Some(aec) = &mut self.aec {
            aec.reset();
        }
    }
}

pub const SOURCE_ACTOR_NAME: &str = "source";

pub enum SourceMsg {
    SetMicMute(bool),
    GetMicMute(RpcReplyPort<bool>),
    SetMicDevice(Option<String>),
    GetMicDevice(RpcReplyPort<Option<String>>),
    GetSessionId(RpcReplyPort<String>),
    MicChunk(AudioChunk),
    SpeakerChunk(AudioChunk),
    StreamFailed(String),
}

pub struct SourceArgs<
    Audio: AudioInputProvider,
    Monitor: DeviceMonitorProvider,
    Emitter: EventEmitter,
    Registry: ActorRegistry,
    Processor: AudioProcessor,
> {
    pub mic_device: Option<String>,
    pub onboarding: bool,
    pub session_id: String,
    pub audio_provider: Audio,
    pub device_monitor_provider: Monitor,
    pub event_emitter: Emitter,
    pub actor_registry: Registry,
    pub audio_processor: Processor,
}

pub struct SourceState<
    Audio: AudioInputProvider,
    Monitor: DeviceMonitorProvider,
    Emitter: EventEmitter,
    Registry: ActorRegistry,
    Processor: AudioProcessor,
> {
    session_id: String,
    mic_device: Option<String>,
    onboarding: bool,
    mic_muted: Arc<AtomicBool>,
    run_task: Option<tokio::task::JoinHandle<()>>,
    stream_cancel_token: Option<CancellationToken>,
    _device_watcher: Option<DeviceChangeWatcher>,
    _silence_stream_tx: Option<std::sync::mpsc::Sender<()>>,
    current_mode: ChannelMode,
    pipeline: Pipeline<Emitter, Registry, Processor>,
    audio_provider: Arc<Audio>,
    _monitor_phantom: std::marker::PhantomData<Monitor>,
}

pub struct SourceActor<
    Audio: AudioInputProvider,
    Monitor: DeviceMonitorProvider,
    Emitter: EventEmitter,
    Registry: ActorRegistry,
    Processor: AudioProcessor,
> {
    _phantom: std::marker::PhantomData<(Audio, Monitor, Emitter, Registry, Processor)>,
}

impl<Audio, Monitor, Emitter, Registry, Processor>
    SourceActor<Audio, Monitor, Emitter, Registry, Processor>
where
    Audio: AudioInputProvider,
    Monitor: DeviceMonitorProvider,
    Emitter: EventEmitter,
    Registry: ActorRegistry,
    Processor: AudioProcessor,
{
    pub fn new() -> Self {
        Self {
            _phantom: std::marker::PhantomData,
        }
    }
}

impl<Audio, Monitor, Emitter, Registry, Processor> Default
    for SourceActor<Audio, Monitor, Emitter, Registry, Processor>
where
    Audio: AudioInputProvider,
    Monitor: DeviceMonitorProvider,
    Emitter: EventEmitter,
    Registry: ActorRegistry,
    Processor: AudioProcessor,
{
    fn default() -> Self {
        Self::new()
    }
}

struct DeviceChangeWatcher {
    _handle: DeviceMonitorHandle,
    _thread: std::thread::JoinHandle<()>,
}

impl DeviceChangeWatcher {
    fn spawn<Audio: AudioInputProvider, Monitor: DeviceMonitorProvider>(
        actor: ActorRef<SourceMsg>,
        device_monitor_provider: &Monitor,
        audio_provider: Arc<Audio>,
    ) -> Self {
        let (event_tx, event_rx) = mpsc::channel();
        let handle = device_monitor_provider.spawn(event_tx);
        let thread = std::thread::spawn(move || Self::event_loop(event_rx, actor, audio_provider));

        Self {
            _handle: handle,
            _thread: thread,
        }
    }

    fn event_loop<Audio: AudioInputProvider>(
        event_rx: Receiver<DeviceEvent>,
        actor: ActorRef<SourceMsg>,
        audio_provider: Arc<Audio>,
    ) {
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
                        let new_device = audio_provider.get_default_device_name();
                        let _ = actor.cast(SourceMsg::SetMicDevice(Some(new_device)));
                        pending_change = false;
                    }
                }
                Err(RecvTimeoutError::Disconnected) => break,
            }
        }
    }
}

impl<Audio, Monitor, Emitter, Registry, Processor>
    SourceActor<Audio, Monitor, Emitter, Registry, Processor>
where
    Audio: AudioInputProvider,
    Monitor: DeviceMonitorProvider,
    Emitter: EventEmitter,
    Registry: ActorRegistry,
    Processor: AudioProcessor,
{
    pub fn name() -> ActorName {
        SOURCE_ACTOR_NAME.into()
    }
}

#[ractor::async_trait]
impl<Audio, Monitor, Emitter, Registry, Processor> Actor
    for SourceActor<Audio, Monitor, Emitter, Registry, Processor>
where
    Audio: AudioInputProvider,
    Monitor: DeviceMonitorProvider,
    Emitter: EventEmitter,
    Registry: ActorRegistry,
    Processor: AudioProcessor,
{
    type Msg = SourceMsg;
    type State = SourceState<Audio, Monitor, Emitter, Registry, Processor>;
    type Arguments = SourceArgs<Audio, Monitor, Emitter, Registry, Processor>;

    async fn pre_start(
        &self,
        myself: ActorRef<Self::Msg>,
        args: Self::Arguments,
    ) -> Result<Self::State, ActorProcessingErr> {
        let audio_provider = Arc::new(args.audio_provider);
        let device_watcher = DeviceChangeWatcher::spawn(
            myself.clone(),
            &args.device_monitor_provider,
            Arc::clone(&audio_provider),
        );

        let silence_stream_tx = Some(hypr_audio::AudioOutput::silence());
        let mic_device = args
            .mic_device
            .or_else(|| Some(audio_provider.get_default_device_name()));
        tracing::info!(mic_device = ?mic_device);

        let pipeline = Pipeline::new(
            args.event_emitter,
            args.actor_registry,
            args.audio_processor,
            args.session_id.clone(),
        );

        let mut st = SourceState {
            session_id: args.session_id,
            mic_device,
            onboarding: args.onboarding,
            mic_muted: Arc::new(AtomicBool::new(false)),
            run_task: None,
            stream_cancel_token: None,
            _device_watcher: Some(device_watcher),
            _silence_stream_tx: silence_stream_tx,
            current_mode: ChannelMode::Dual,
            pipeline,
            audio_provider,
            _monitor_phantom: std::marker::PhantomData,
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
            SourceMsg::SetMicDevice(_dev) => {
                tracing::info!("device_change_triggering_restart");
                myself.stop(Some("device_change".to_string()));
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

async fn start_source_loop<
    Audio: AudioInputProvider,
    Monitor: DeviceMonitorProvider,
    Emitter: EventEmitter,
    Registry: ActorRegistry,
    Processor: AudioProcessor,
>(
    myself: &ActorRef<SourceMsg>,
    st: &mut SourceState<Audio, Monitor, Emitter, Registry, Processor>,
) -> Result<(), ActorProcessingErr> {
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

    if new_mode == ChannelMode::Single {
        start_source_loop_single(myself, st).await
    } else {
        start_source_loop_dual(myself, st).await
    }
}

async fn start_source_loop_single<
    Audio: AudioInputProvider,
    Monitor: DeviceMonitorProvider,
    Emitter: EventEmitter,
    Registry: ActorRegistry,
    Processor: AudioProcessor,
>(
    myself: &ActorRef<SourceMsg>,
    st: &mut SourceState<Audio, Monitor, Emitter, Registry, Processor>,
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
        let audio_provider = Arc::clone(&st.audio_provider);

        let stream_cancel_token = CancellationToken::new();
        st.stream_cancel_token = Some(stream_cancel_token.clone());

        let handle = tokio::spawn(async move {
            let mic_stream = {
                let mut mic_input = match audio_provider.from_mic(mic_device.clone()) {
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

async fn start_source_loop_dual<
    Audio: AudioInputProvider,
    Monitor: DeviceMonitorProvider,
    Emitter: EventEmitter,
    Registry: ActorRegistry,
    Processor: AudioProcessor,
>(
    myself: &ActorRef<SourceMsg>,
    st: &mut SourceState<Audio, Monitor, Emitter, Registry, Processor>,
) -> Result<(), ActorProcessingErr> {
    let myself2 = myself.clone();
    let mic_muted = st.mic_muted.clone();
    let mic_device = st.mic_device.clone();
    let audio_provider = Arc::clone(&st.audio_provider);

    let stream_cancel_token = CancellationToken::new();
    st.stream_cancel_token = Some(stream_cancel_token.clone());

    let handle = tokio::spawn(async move {
        let mic_stream = {
            let mut mic_input = match audio_provider.from_mic(mic_device.clone()) {
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
            let mut spk_input = audio_provider.from_speaker();
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

struct Pipeline<Emitter: EventEmitter, Registry: ActorRegistry, Processor: AudioProcessor> {
    processor: Processor,
    joiner: Joiner,
    amplitude: AmplitudeEmitter<Emitter>,
    audio_buffer: AudioBuffer,
    backlog_quota: f32,
    registry: Registry,
}

impl<Emitter: EventEmitter, Registry: ActorRegistry, Processor: AudioProcessor>
    Pipeline<Emitter, Registry, Processor>
{
    const BACKLOG_QUOTA_INCREMENT: f32 = 0.25;
    const MAX_BACKLOG_QUOTA: f32 = 2.0;

    fn new(emitter: Emitter, registry: Registry, processor: Processor, session_id: String) -> Self {
        Self {
            processor,
            joiner: Joiner::new(),
            amplitude: AmplitudeEmitter::new(emitter, session_id),
            audio_buffer: AudioBuffer::new(MAX_BUFFER_CHUNKS),
            backlog_quota: 0.0,
            registry,
        }
    }

    fn reset(&mut self) {
        self.joiner.reset();
        self.processor.reset();
        self.amplitude.reset();
        self.audio_buffer.clear();
        self.backlog_quota = 0.0;
    }

    fn ingest_mic(&mut self, chunk: AudioChunk) {
        let mut data = chunk.data;
        self.processor.process_mic(&mut data);
        let arc = Arc::<[f32]>::from(data);
        self.joiner.push_mic(arc);
    }

    fn ingest_speaker(&mut self, chunk: AudioChunk) {
        let mut data = chunk.data;
        self.processor.process_speaker(&mut data);
        let arc = Arc::<[f32]>::from(data);
        self.joiner.push_spk(arc);
    }

    fn flush(&mut self, mode: ChannelMode) {
        while let Some((mic, spk)) = self.joiner.pop_pair(mode) {
            self.dispatch(mic, spk, mode);
        }
    }

    fn dispatch(&mut self, mic: Arc<[f32]>, spk: Arc<[f32]>, mode: ChannelMode) {
        let (processed_mic, processed_spk) = match self.processor.process_aec(&mic, &spk) {
            Ok(processed) => {
                let processed_arc = Arc::<[f32]>::from(processed);
                (processed_arc, Arc::clone(&spk))
            }
            Err(e) => {
                tracing::warn!(error = ?e, "aec_failed");
                (mic, spk)
            }
        };

        if let Some(actor) = self.registry.find_recorder() {
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

        self.amplitude
            .observe(Arc::clone(&processed_mic), Arc::clone(&processed_spk));

        let Some(actor) = self.registry.find_listener() else {
            self.audio_buffer.push(processed_mic, processed_spk, mode);
            tracing::debug!(
                actor = ListenerActor::name(),
                buffered = self.audio_buffer.len(),
                "listener_unavailable_buffering"
            );
            return;
        };

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
        let result = if mode == ChannelMode::Single {
            let audio_bytes = f32_to_i16_bytes(mic.to_vec().iter().copied());
            actor.cast(ListenerMsg::AudioSingle(audio_bytes))
        } else {
            let mic_bytes = f32_to_i16_bytes(mic.iter().copied());
            let spk_bytes = f32_to_i16_bytes(spk.iter().copied());
            actor.cast(ListenerMsg::AudioDual(mic_bytes, spk_bytes))
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

struct AmplitudeEmitter<Emitter: EventEmitter> {
    emitter: Emitter,
    session_id: String,
    last_mic: Option<Arc<[f32]>>,
    last_spk: Option<Arc<[f32]>>,
    last_emit: Instant,
}

impl<Emitter: EventEmitter> AmplitudeEmitter<Emitter> {
    fn new(emitter: Emitter, session_id: String) -> Self {
        Self {
            emitter,
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

        if let Err(error) =
            self.emitter
                .emit_audio_amplitude(&self.session_id, mic_level, spk_level)
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
#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;

    struct MockEventEmitter {
        events: Arc<Mutex<Vec<(String, u16, u16)>>>,
    }

    impl MockEventEmitter {
        fn new() -> Self {
            Self {
                events: Arc::new(Mutex::new(Vec::new())),
            }
        }
    }

    impl EventEmitter for MockEventEmitter {
        fn emit_audio_amplitude(
            &self,
            session_id: &str,
            mic: u16,
            speaker: u16,
        ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
            self.events
                .lock()
                .unwrap()
                .push((session_id.to_string(), mic, speaker));
            Ok(())
        }
    }

    struct MockActorRegistry;

    impl ActorRegistry for MockActorRegistry {
        fn find_listener(&self) -> Option<ActorRef<ListenerMsg>> {
            None
        }

        fn find_recorder(&self) -> Option<ActorRef<RecMsg>> {
            None
        }
    }

    struct MockAudioProcessor;

    impl AudioProcessor for MockAudioProcessor {
        fn process_mic(&mut self, _data: &mut [f32]) {}
        fn process_speaker(&mut self, _data: &mut [f32]) {}
        fn process_aec(
            &mut self,
            mic: &[f32],
            _spk: &[f32],
        ) -> Result<Vec<f32>, Box<dyn std::error::Error + Send + Sync>> {
            Ok(mic.to_vec())
        }
        fn reset(&mut self) {}
    }

    #[test]
    fn test_joiner_new() {
        let joiner = Joiner::new();
        assert!(joiner.mic.is_empty());
        assert!(joiner.spk.is_empty());
    }

    #[test]
    fn test_joiner_push_mic() {
        let mut joiner = Joiner::new();
        let data: Arc<[f32]> = Arc::from(vec![0.1, 0.2, 0.3]);
        joiner.push_mic(data.clone());
        assert_eq!(joiner.mic.len(), 1);
        assert_eq!(joiner.mic.front().unwrap().len(), 3);
    }

    #[test]
    fn test_joiner_push_spk() {
        let mut joiner = Joiner::new();
        let data: Arc<[f32]> = Arc::from(vec![0.4, 0.5, 0.6]);
        joiner.push_spk(data.clone());
        assert_eq!(joiner.spk.len(), 1);
        assert_eq!(joiner.spk.front().unwrap().len(), 3);
    }

    #[test]
    fn test_joiner_pop_pair_dual_mode() {
        let mut joiner = Joiner::new();
        let mic_data: Arc<[f32]> = Arc::from(vec![0.1, 0.2, 0.3]);
        let spk_data: Arc<[f32]> = Arc::from(vec![0.4, 0.5, 0.6]);
        joiner.push_mic(mic_data);
        joiner.push_spk(spk_data);

        let pair = joiner.pop_pair(ChannelMode::Dual);
        assert!(pair.is_some());
        let (mic, spk) = pair.unwrap();
        assert_eq!(mic.len(), 3);
        assert_eq!(spk.len(), 3);
    }

    #[test]
    fn test_joiner_pop_pair_single_mode_with_silence() {
        let mut joiner = Joiner::new();
        let mic_data: Arc<[f32]> = Arc::from(vec![0.1, 0.2, 0.3]);
        joiner.push_mic(mic_data);

        let pair = joiner.pop_pair(ChannelMode::Single);
        assert!(pair.is_some());
        let (mic, spk) = pair.unwrap();
        assert_eq!(mic.len(), 3);
        assert_eq!(spk.len(), 3);
        assert!(spk.iter().all(|&x| x == 0.0));
    }

    #[test]
    fn test_joiner_reset() {
        let mut joiner = Joiner::new();
        joiner.push_mic(Arc::from(vec![0.1, 0.2]));
        joiner.push_spk(Arc::from(vec![0.3, 0.4]));
        joiner.reset();
        assert!(joiner.mic.is_empty());
        assert!(joiner.spk.is_empty());
    }

    #[test]
    fn test_audio_buffer_new() {
        let buffer = AudioBuffer::new(10);
        assert!(buffer.is_empty());
        assert_eq!(buffer.len(), 0);
    }

    #[test]
    fn test_audio_buffer_push_pop() {
        let mut buffer = AudioBuffer::new(10);
        let mic: Arc<[f32]> = Arc::from(vec![0.1, 0.2]);
        let spk: Arc<[f32]> = Arc::from(vec![0.3, 0.4]);
        buffer.push(mic.clone(), spk.clone(), ChannelMode::Dual);

        assert_eq!(buffer.len(), 1);
        let item = buffer.pop();
        assert!(item.is_some());
        let (m, s, mode) = item.unwrap();
        assert_eq!(m.len(), 2);
        assert_eq!(s.len(), 2);
        assert_eq!(mode, ChannelMode::Dual);
    }

    #[test]
    fn test_audio_buffer_overflow() {
        let mut buffer = AudioBuffer::new(3);
        for i in 0..5 {
            let mic: Arc<[f32]> = Arc::from(vec![i as f32]);
            let spk: Arc<[f32]> = Arc::from(vec![i as f32]);
            buffer.push(mic, spk, ChannelMode::Single);
        }

        assert_eq!(buffer.len(), 3);
        let (mic, _, _) = buffer.pop().unwrap();
        assert_eq!(mic[0], 2.0);
    }

    #[test]
    fn test_audio_buffer_clear() {
        let mut buffer = AudioBuffer::new(10);
        buffer.push(
            Arc::from(vec![0.1]),
            Arc::from(vec![0.2]),
            ChannelMode::Dual,
        );
        buffer.push(
            Arc::from(vec![0.3]),
            Arc::from(vec![0.4]),
            ChannelMode::Dual,
        );
        buffer.clear();
        assert!(buffer.is_empty());
    }

    #[test]
    fn test_amplitude_emitter_amplitude_from_chunk() {
        let chunk = vec![0.0, 0.5, -0.8, 0.3, -0.2];
        let amplitude = AmplitudeEmitter::<MockEventEmitter>::amplitude_from_chunk(&chunk);
        assert_eq!(amplitude, 80);
    }

    #[test]
    fn test_amplitude_emitter_amplitude_from_silence() {
        let chunk = vec![0.0; 100];
        let amplitude = AmplitudeEmitter::<MockEventEmitter>::amplitude_from_chunk(&chunk);
        assert_eq!(amplitude, 0);
    }

    #[test]
    fn test_amplitude_emitter_amplitude_from_full_scale() {
        let chunk = vec![1.0, -1.0, 0.5];
        let amplitude = AmplitudeEmitter::<MockEventEmitter>::amplitude_from_chunk(&chunk);
        assert_eq!(amplitude, 100);
    }

    #[test]
    fn test_default_audio_processor_process_mic() {
        let mut processor = DefaultAudioProcessor::default();
        let mut data = vec![0.1, 0.2, 0.3];
        processor.process_mic(&mut data);
    }

    #[test]
    fn test_default_audio_processor_process_speaker() {
        let mut processor = DefaultAudioProcessor::default();
        let mut data = vec![0.1, 0.2, 0.3];
        processor.process_speaker(&mut data);
    }

    #[test]
    fn test_default_audio_processor_reset() {
        let mut processor = DefaultAudioProcessor::default();
        processor.reset();
    }

    #[test]
    fn test_pipeline_new() {
        let emitter = MockEventEmitter::new();
        let registry = MockActorRegistry;
        let processor = MockAudioProcessor;
        let _pipeline = Pipeline::new(emitter, registry, processor, "test_session".to_string());
    }

    #[test]
    fn test_pipeline_ingest_mic() {
        let emitter = MockEventEmitter::new();
        let registry = MockActorRegistry;
        let processor = MockAudioProcessor;
        let mut pipeline = Pipeline::new(emitter, registry, processor, "test_session".to_string());

        let chunk = AudioChunk {
            data: vec![0.1, 0.2, 0.3],
        };
        pipeline.ingest_mic(chunk);
    }

    #[test]
    fn test_pipeline_ingest_speaker() {
        let emitter = MockEventEmitter::new();
        let registry = MockActorRegistry;
        let processor = MockAudioProcessor;
        let mut pipeline = Pipeline::new(emitter, registry, processor, "test_session".to_string());

        let chunk = AudioChunk {
            data: vec![0.4, 0.5, 0.6],
        };
        pipeline.ingest_speaker(chunk);
    }

    #[test]
    fn test_pipeline_reset() {
        let emitter = MockEventEmitter::new();
        let registry = MockActorRegistry;
        let processor = MockAudioProcessor;
        let mut pipeline = Pipeline::new(emitter, registry, processor, "test_session".to_string());

        let chunk = AudioChunk {
            data: vec![0.1, 0.2],
        };
        pipeline.ingest_mic(chunk);
        pipeline.reset();
    }
}
