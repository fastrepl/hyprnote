use std::collections::VecDeque;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};

use futures_util::StreamExt;
use ractor::{registry, Actor, ActorName, ActorProcessingErr, ActorRef, RpcReplyPort};
use ractor_supervisor::supervisor::SupervisorMsg;
use tauri_specta::Event;

use crate::actors::{
    ChannelMode, ListenerActor, ListenerMsg, LiveContextHandle, LiveSnapshot, RecMsg, RecorderActor,
};
use crate::SessionEvent;
use hypr_audio::{
    is_using_headphone, AudioInput, DeviceEvent, DeviceMonitor, DeviceMonitorHandle, MicInput,
    SpeakerInput,
};

const AEC_BLOCK_SIZE: usize = 512;
const AUDIO_AMPLITUDE_THROTTLE: Duration = Duration::from_millis(100);

pub enum SourceMsg {
    SetMicMute(bool),
    GetMicMute(RpcReplyPort<bool>),
    SetMicDevice(Option<String>),
    GetMicDevice(RpcReplyPort<Option<String>>),
}

pub struct SourceArgs {
    pub mic_device: Option<String>,
    pub onboarding: bool,
    pub app: tauri::AppHandle,
    pub ctx: LiveContextHandle,
    pub supervisor: ActorRef<SupervisorMsg>,
}

pub struct SourceState {
    mic_device: Option<String>,
    onboarding: bool,
    app: tauri::AppHandle,
    ctx: LiveContextHandle,
    supervisor: ActorRef<SupervisorMsg>,
    mic_muted: Arc<AtomicBool>,
    run_task: Option<tokio::task::JoinHandle<()>>,
    _device_monitor_handle: Option<DeviceMonitorHandle>,
    _silence_stream_tx: Option<std::sync::mpsc::Sender<()>>,
    _device_event_thread: Option<std::thread::JoinHandle<()>>,
    current_mode: ChannelMode,
    sample_rate: u32,
    agc_m: hypr_agc::Agc,
    agc_s: hypr_agc::Agc,
    joiner: Joiner,
    last_sent_mic: Option<Arc<[f32]>>,
    last_sent_spk: Option<Arc<[f32]>>,
    last_amp_emit: Instant,
}

impl SourceState {
    fn reset_pipeline(&mut self) {
        self.joiner.reset();
        self.last_sent_mic = None;
        self.last_sent_spk = None;
        self.agc_m = hypr_agc::Agc::default();
        self.agc_s = hypr_agc::Agc::default();
        self.last_amp_emit = Instant::now();
    }
}

pub struct SourceActor;

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
        let (event_tx, event_rx) = std::sync::mpsc::channel();
        let device_monitor_handle = DeviceMonitor::spawn(event_tx);

        let myself_clone = myself.clone();

        let device_event_thread = std::thread::spawn(move || {
            use std::sync::mpsc::RecvTimeoutError;
            use std::time::Duration;

            let debounce_duration = Duration::from_millis(1000);

            loop {
                match event_rx.recv() {
                    Ok(event) => match event {
                        DeviceEvent::DefaultInputChanged { .. }
                        | DeviceEvent::DefaultOutputChanged { .. } => {
                            tracing::info!(event = ?event, "device_event_outer");

                            loop {
                                let event = event_rx.recv_timeout(debounce_duration);
                                tracing::info!(event = ?event, "device_event_inner");

                                match event {
                                    Ok(DeviceEvent::DefaultInputChanged { .. })
                                    | Ok(DeviceEvent::DefaultOutputChanged { .. }) => {
                                        continue;
                                    }
                                    Err(RecvTimeoutError::Timeout) => {
                                        let new_device = AudioInput::get_default_device_name();
                                        let _ = myself_clone
                                            .cast(SourceMsg::SetMicDevice(Some(new_device)));
                                        break;
                                    }
                                    Err(RecvTimeoutError::Disconnected) => return,
                                }
                            }
                        }
                    },
                    Err(_) => break,
                }
            }
        });

        let silence_stream_tx = Some(hypr_audio::AudioOutput::silence());
        let mic_device = args
            .mic_device
            .or_else(|| Some(AudioInput::get_default_device_name()));
        tracing::info!(mic_device = ?mic_device);

        let sample_rate = MicInput::new(mic_device.clone())
            .map_err(|err| -> ActorProcessingErr { Box::new(err) })?
            .sample_rate();
        tracing::info!(sample_rate, "mic_sample_rate_resolved");

        #[cfg(any(target_os = "macos", target_os = "windows"))]
        match SpeakerInput::new() {
            Ok(input) => {
                let speaker_rate_hz = input.sample_rate();
                if speaker_rate_hz != sample_rate {
                    tracing::warn!(
                        mic_sample_rate = sample_rate,
                        speaker_sample_rate = speaker_rate_hz,
                        "sample_rate_mismatch"
                    );
                }
            }
            Err(err) => {
                tracing::warn!(error = ?err, "speaker_sample_rate_unavailable");
            }
        }

        let mut st = SourceState {
            mic_device,
            onboarding: args.onboarding,
            app: args.app,
            ctx: args.ctx,
            supervisor: args.supervisor,
            mic_muted: Arc::new(AtomicBool::new(false)),
            run_task: None,
            _device_monitor_handle: Some(device_monitor_handle),
            _silence_stream_tx: silence_stream_tx,
            _device_event_thread: Some(device_event_thread),
            current_mode: ChannelMode::Dual,
            sample_rate,
            agc_m: hypr_agc::Agc::default(),
            agc_s: hypr_agc::Agc::default(),
            joiner: Joiner::new(),
            last_sent_mic: None,
            last_sent_spk: None,
            last_amp_emit: Instant::now(),
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
                tracing::info!(device = ?dev, "source_actor_set_mic_device");
                st.mic_device = dev;
                let device = st.mic_device.clone();

                st.ctx
                    .write(|snap| {
                        snap.device_id = device.clone();
                    })
                    .await;

                if let Some(t) = st.run_task.take() {
                    t.abort();
                }

                request_rest_for_one(&st.supervisor, SourceActor::name());
                tracing::info!("source_actor_stopping_for_device_change");
                myself.stop(Some("device_change".into()));
                return Ok(());
            }
        }

        Ok(())
    }

    async fn post_stop(
        &self,
        _myself: ActorRef<Self::Msg>,
        st: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        tracing::info!("source_actor_post_stop");
        if let Some(task) = st.run_task.take() {
            task.abort();
        }

        Ok(())
    }
}

async fn start_source_loop(
    _myself: &ActorRef<SourceMsg>,
    st: &mut SourceState,
) -> Result<(), ActorProcessingErr> {
    let mic_muted = st.mic_muted.clone();
    let mic_device = st.mic_device.clone();
    let app = st.app.clone();

    let previous_snapshot = st.ctx.read().await;
    let default_snapshot = LiveSnapshot::default();
    let was_initialized = previous_snapshot.device_id.is_some()
        || previous_snapshot.mode != default_snapshot.mode
        || previous_snapshot.sample_rate != default_snapshot.sample_rate;

    #[cfg(target_os = "macos")]
    let new_mode = if !st.onboarding && !is_using_headphone() {
        ChannelMode::Single
    } else {
        ChannelMode::Dual
    };

    #[cfg(not(target_os = "macos"))]
    let new_mode = ChannelMode::Dual;

    let new_sample_rate = st.sample_rate;

    let mode_changed = previous_snapshot.mode != new_mode;
    let rate_changed = previous_snapshot.sample_rate != new_sample_rate;
    st.current_mode = new_mode;

    tracing::info!(
        ?new_mode,
        mode_changed,
        rate_changed,
        sample_rate = new_sample_rate,
        "start_source_loop"
    );

    let device_id = st.mic_device.clone();

    st.ctx
        .write(|snap| {
            snap.mode = new_mode;
            snap.sample_rate = new_sample_rate;
            snap.device_id = device_id.clone();
        })
        .await;

    st.reset_pipeline();

    if was_initialized && (mode_changed || rate_changed) {
        request_rest_for_one(&st.supervisor, ListenerActor::name());
    }

    let handle = spawn_capture_task(mic_device, mic_muted, new_mode, new_sample_rate, app);

    st.run_task = Some(handle);
    Ok(())
}

fn spawn_capture_task(
    mic_device: Option<String>,
    mic_muted: Arc<AtomicBool>,
    mode: ChannelMode,
    sample_rate: u32,
    app: tauri::AppHandle,
) -> tokio::task::JoinHandle<()> {
    tokio::spawn(async move {
        let mic_device_name = mic_device.clone();
        let mic_stream = match MicInput::new(mic_device) {
            Ok(mic_input) => mic_input.stream().chunks(AEC_BLOCK_SIZE),
            Err(err) => {
                tracing::error!(
                    error = ?err,
                    mic_device = ?mic_device_name,
                    "mic_stream_init_failed"
                );
                return;
            }
        };

        tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;

        let spk_stream = match SpeakerInput::new().and_then(|input| input.stream()) {
            Ok(stream) => stream.chunks(AEC_BLOCK_SIZE),
            Err(err) => {
                tracing::error!(error = ?err, "speaker_stream_init_failed");
                return;
            }
        };

        tokio::pin!(mic_stream);
        tokio::pin!(spk_stream);

        let mut agc_m = hypr_agc::Agc::default();
        let mut agc_s = hypr_agc::Agc::default();
        let mut joiner = Joiner::new();
        let mut last_sent_mic: Option<Arc<[f32]>> = None;
        let mut last_sent_spk: Option<Arc<[f32]>> = None;
        let mut last_amp_emit = Instant::now();

        loop {
            tokio::select! {
                mic_next = mic_stream.next() => {
                    if let Some(mut data) = mic_next {
                        let output_data = if mic_muted.load(Ordering::Relaxed) {
                            vec![0.0; data.len()]
                        } else {
                            agc_m.process(&mut data);
                            data
                        };
                        let arc = Arc::<[f32]>::from(output_data);
                        joiner.push_mic(arc);
                        process_ready_inline(&mut joiner, mode, sample_rate, &mut last_sent_mic, &mut last_sent_spk, &mut last_amp_emit, &app).await;
                    } else {
                        break;
                    }
                }
                spk_next = spk_stream.next() => {
                    if let Some(mut data) = spk_next {
                        agc_s.process(&mut data);
                        let arc = Arc::<[f32]>::from(data);
                        joiner.push_spk(arc);
                        process_ready_inline(&mut joiner, mode, sample_rate, &mut last_sent_mic, &mut last_sent_spk, &mut last_amp_emit, &app).await;
                    } else {
                        break;
                    }
                }
            }
        }
    })
}

async fn process_ready_inline(
    joiner: &mut Joiner,
    mode: ChannelMode,
    sample_rate: u32,
    last_sent_mic: &mut Option<Arc<[f32]>>,
    last_sent_spk: &mut Option<Arc<[f32]>>,
    last_amp_emit: &mut Instant,
    app: &tauri::AppHandle,
) {
    while let Some((mic, spk)) = joiner.pop_pair(mode) {
        let mut audio_sent_successfully = false;

        if let Some(cell) = registry::where_is(RecorderActor::name()) {
            let mixed: Vec<f32> = mic
                .iter()
                .zip(spk.iter())
                .map(|(m, s)| (m + s).clamp(-1.0, 1.0))
                .collect();

            let actor: ActorRef<RecMsg> = cell.into();
            if let Err(e) = actor.cast(RecMsg::Audio {
                samples: mixed,
                sample_rate,
            }) {
                tracing::error!(error = ?e, "failed_to_send_audio_to_recorder");
            }
        }

        if let Some(cell) = registry::where_is(ListenerActor::name()) {
            let (mic_bytes, spk_bytes) = if mode == ChannelMode::Single {
                let mixed: Vec<f32> = mic
                    .iter()
                    .zip(spk.iter())
                    .map(|(m, s)| (m + s).clamp(-1.0, 1.0))
                    .collect();
                let mixed_bytes = hypr_audio_utils::f32_to_i16_bytes(mixed.iter().copied());
                (
                    hypr_audio_utils::f32_to_i16_bytes(mic.iter().copied()),
                    mixed_bytes,
                )
            } else {
                (
                    hypr_audio_utils::f32_to_i16_bytes(mic.iter().copied()),
                    hypr_audio_utils::f32_to_i16_bytes(spk.iter().copied()),
                )
            };

            let actor: ActorRef<ListenerMsg> = cell.into();
            if actor
                .cast(ListenerMsg::Audio(mic_bytes.into(), spk_bytes.into()))
                .is_ok()
            {
                audio_sent_successfully = true;
                *last_sent_mic = Some(mic.clone());
                *last_sent_spk = Some(spk.clone());
            } else {
                tracing::warn!(actor = ListenerActor::name(), "cast_failed");
            }
        } else {
            tracing::debug!(actor = ListenerActor::name(), "unavailable");
        }

        if audio_sent_successfully && last_amp_emit.elapsed() >= AUDIO_AMPLITUDE_THROTTLE {
            if let (Some(mic_data), Some(spk_data)) =
                (last_sent_mic.as_ref(), last_sent_spk.as_ref())
            {
                if let Err(e) = SessionEvent::from((mic_data.as_ref(), spk_data.as_ref())).emit(app)
                {
                    tracing::error!("{:?}", e);
                }
                *last_amp_emit = Instant::now();
            }
        }
    }
}

fn request_rest_for_one(supervisor: &ActorRef<SupervisorMsg>, child_id: ActorName) {
    let child_id_string = child_id.to_string();
    tracing::info!(child = child_id_string, "requesting_rest_for_one_spawn");
    match supervisor.cast(SupervisorMsg::RestForOneSpawn {
        child_id: child_id_string.clone(),
    }) {
        Ok(_) => {
            tracing::info!(child = child_id_string, "requested_rest_for_one_spawn");
        }
        Err(error) => {
            tracing::warn!(
                ?error,
                child = child_id_string,
                "failed_to_request_rest_for_one"
            );
        }
    }
}

struct Joiner {
    mic: VecDeque<Arc<[f32]>>,
    spk: VecDeque<Arc<[f32]>>,
    silence_cache: std::collections::HashMap<usize, Arc<[f32]>>,
}

impl Joiner {
    const MAX_LAG: usize = 4;
    const MAX_QUEUE_SIZE: usize = 30;

    fn new() -> Self {
        Self {
            mic: VecDeque::new(),
            spk: VecDeque::new(),
            silence_cache: std::collections::HashMap::new(),
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
        match (self.mic.front(), self.spk.front()) {
            (Some(_), Some(_)) => {
                let mic = self.mic.pop_front()?;
                let spk = self.spk.pop_front()?;
                Some((mic, spk))
            }
            (Some(_), None) if mode == ChannelMode::Single || self.mic.len() > Self::MAX_LAG => {
                let mic = self.mic.pop_front()?;
                let spk = self.get_silence(mic.len());
                Some((mic, spk))
            }
            (None, Some(_)) if self.spk.len() > Self::MAX_LAG => {
                let spk = self.spk.pop_front()?;
                let mic = self.get_silence(spk.len());
                Some((mic, spk))
            }
            _ => None,
        }
    }
}
