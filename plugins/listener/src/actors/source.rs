use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

use futures_util::StreamExt;
use ractor::{registry, Actor, ActorName, ActorProcessingErr, ActorRef, RpcReplyPort};
use tokio_util::sync::CancellationToken;

use crate::actors::{AudioChunk, ChannelMode, ListenerActor, ListenerMsg, ProcMsg, ProcessorActor};
use hypr_audio::{
    is_using_headphone, AudioInput, DeviceEvent, DeviceMonitor, DeviceMonitorHandle,
    ResampledAsyncSource,
};

const SAMPLE_RATE: u32 = 16000;

pub enum SourceMsg {
    SetMicMute(bool),
    GetMicMute(RpcReplyPort<bool>),
    SetMicDevice(Option<String>),
    GetMicDevice(RpcReplyPort<Option<String>>),
    GetMode(RpcReplyPort<ChannelMode>),
}

pub struct SourceArgs {
    pub mic_device: Option<String>,
    pub token: CancellationToken,
    pub onboarding: bool,
}

pub struct SourceState {
    mic_device: Option<String>,
    token: CancellationToken,
    onboarding: bool,
    mic_muted: Arc<AtomicBool>,
    run_task: Option<tokio::task::JoinHandle<()>>,
    stream_cancel_token: Option<CancellationToken>,
    _device_monitor_handle: Option<DeviceMonitorHandle>,
    _silence_stream_tx: Option<std::sync::mpsc::Sender<()>>,
    _device_event_thread: Option<std::thread::JoinHandle<()>>,
    current_mode: ChannelMode,
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

        let mut st = SourceState {
            mic_device,
            token: args.token,
            onboarding: args.onboarding,
            mic_muted: Arc::new(AtomicBool::new(false)),
            run_task: None,
            stream_cancel_token: None,
            _device_monitor_handle: Some(device_monitor_handle),
            _silence_stream_tx: silence_stream_tx,
            _device_event_thread: Some(device_event_thread),
            current_mode: ChannelMode::Dual,
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

                if let Some(cancel_token) = st.stream_cancel_token.take() {
                    cancel_token.cancel();
                }

                if let Some(t) = st.run_task.take() {
                    t.abort();
                }
                start_source_loop(&myself, st).await?;
            }
            SourceMsg::GetMode(reply) => {
                if !reply.is_closed() {
                    let _ = reply.send(st.current_mode);
                }
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

    #[cfg(target_os = "macos")]
    let new_mode = if !st.onboarding && !is_using_headphone() {
        ChannelMode::Single
    } else {
        ChannelMode::Dual
    };

    #[cfg(not(target_os = "macos"))]
    let new_mode = ChannelMode::Dual;

    let mode_changed = st.current_mode != new_mode;
    st.current_mode = new_mode;

    tracing::info!(?new_mode, mode_changed, "start_source_loop");

    if let Some(cell) = registry::where_is(ProcessorActor::name()) {
        let actor: ActorRef<ProcMsg> = cell.into();
        let _ = actor.cast(ProcMsg::Reset);
    }

    if mode_changed {
        if let Some(cell) = registry::where_is(ProcessorActor::name()) {
            let actor: ActorRef<ProcMsg> = cell.into();
            let _ = actor.cast(ProcMsg::SetMode(new_mode));
        }

        if let Some(cell) = registry::where_is(ListenerActor::name()) {
            let actor: ActorRef<ListenerMsg> = cell.into();
            let _ = actor.cast(ListenerMsg::ChangeMode(new_mode));
        }
    }

    let use_mixed = new_mode == ChannelMode::Single;

    let handle = if use_mixed {
        #[cfg(target_os = "macos")]
        {
            tokio::spawn(async move {
                let mic_stream = {
                    let mut mic_input = AudioInput::from_mic(mic_device).unwrap();
                    let chunk_size = chunk_size_from_sample_rate(SAMPLE_RATE);
                    ResampledAsyncSource::new(mic_input.stream(), SAMPLE_RATE).chunks(chunk_size)
                };
                tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
                let spk_stream = {
                    let mut spk_input = hypr_audio::AudioInput::from_speaker();
                    let chunk_size = chunk_size_from_sample_rate(SAMPLE_RATE);
                    ResampledAsyncSource::new(spk_input.stream(), SAMPLE_RATE).chunks(chunk_size)
                };

                tokio::pin!(mic_stream);
                tokio::pin!(spk_stream);

                loop {
                    let Some(cell) = registry::where_is(ProcessorActor::name()) else {
                        tracing::warn!("processor_actor_not_found");
                        continue;
                    };
                    let proc: ActorRef<ProcMsg> = cell.into();

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
                        mic_next = mic_stream.next() => {
                            if let Some(data) = mic_next {
                                let output_data = if mic_muted.load(Ordering::Relaxed) {
                                    vec![0.0; data.len()]
                                } else {
                                    data
                                };
                                let msg = ProcMsg::Mic(AudioChunk { data: output_data });
                                let _ = proc.cast(msg);
                            } else {
                                break;
                            }
                        }
                        spk_next = spk_stream.next() => {
                            if let Some(data) = spk_next {
                                let msg = ProcMsg::Speaker(AudioChunk{ data });
                                let _ = proc.cast(msg);
                            } else {
                                break;
                            }
                        }
                    }
                }
            })
        }
        #[cfg(not(target_os = "macos"))]
        {
            tokio::spawn(async move {})
        }
    } else {
        tokio::spawn(async move {
            let mic_stream = {
                let mut mic_input = hypr_audio::AudioInput::from_mic(mic_device).unwrap();
                let chunk_size = chunk_size_from_sample_rate(mic_input.sample_rate());
                mic_input.stream().chunks(chunk_size)
            };
            tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
            let spk_stream = {
                let mut spk_input = hypr_audio::AudioInput::from_speaker();
                let chunk_size = chunk_size_from_sample_rate(spk_input.sample_rate());
                spk_input.stream().chunks(chunk_size)
            };
            tokio::pin!(mic_stream);
            tokio::pin!(spk_stream);

            loop {
                let Some(cell) = registry::where_is(ProcessorActor::name()) else {
                    tracing::warn!("processor_actor_not_found");
                    continue;
                };
                let proc: ActorRef<ProcMsg> = cell.into();

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
                    mic_next = mic_stream.next() => {
                        if let Some(data) = mic_next {
                            let output_data = if mic_muted.load(Ordering::Relaxed) {
                                vec![0.0; data.len()]
                            } else {
                                data
                            };

                            let msg = ProcMsg::Mic(AudioChunk{ data: output_data });
                            let _ = proc.cast(msg);
                        } else {
                            break;
                        }
                    }
                    spk_next = spk_stream.next() => {
                        if let Some(data) = spk_next {
                            let msg = ProcMsg::Speaker(AudioChunk{ data });
                            let _ = proc.cast(msg);
                        } else {
                            break;
                        }
                    }
                }
            }
        })
    };

    st.run_task = Some(handle);
    Ok(())
}

fn chunk_size_from_sample_rate(sample_rate: u32) -> usize {
    // https://github.com/orgs/deepgram/discussions/224#discussioncomment-6234166
    const CHUNK_MS: u32 = 120;

    let samples = ((sample_rate as u64) * (CHUNK_MS as u64)) / 1000;
    let samples = samples.max(1024).min(7168) as usize;

    tracing::info!(
        sample_rate = sample_rate,
        samples = samples,
        "chunk_size_from_sample_rate"
    );

    samples
}
