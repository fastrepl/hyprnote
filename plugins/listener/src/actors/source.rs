use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

use futures_util::StreamExt;
use ractor::{registry, Actor, ActorName, ActorProcessingErr, ActorRef, RpcReplyPort};
use tokio_util::sync::CancellationToken;

use crate::actors::{AudioChunk, ProcMsg, ProcessorActor};
use hypr_audio::{
    AudioInput, DeviceEvent, DeviceMonitor, DeviceMonitorHandle, ResampledAsyncSource,
};

// We previously used AEC; it has been removed.  Keep this constant to preserve chunking size.
const AEC_BLOCK_SIZE: usize = 512;
const SAMPLE_RATE: u32 = 16000;

pub enum SourceMsg {
    SetMicMute(bool),
    GetMicMute(RpcReplyPort<bool>),
    SetSpkMute(bool),
    GetSpkMute(RpcReplyPort<bool>),
    SetMicDevice(Option<String>),
    GetMicDevice(RpcReplyPort<Option<String>>),
}

pub struct SourceArgs {
    pub device: Option<String>,
    pub token: CancellationToken,
}

pub struct SourceState {
    mic_device: Option<String>,
    token: CancellationToken,
    mic_muted: Arc<AtomicBool>,
    spk_muted: Arc<AtomicBool>,
    run_task: Option<tokio::task::JoinHandle<()>>,
    stream_cancel_token: Option<CancellationToken>,
    _device_monitor_handle: Option<DeviceMonitorHandle>,
    _silence_stream_tx: Option<std::sync::mpsc::Sender<()>>,
}

pub struct SourceActor;

impl SourceActor {
    pub fn name() -> ActorName {
        "source".into()
    }
}

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
        std::thread::spawn(move || {
            while let Ok(event) = event_rx.recv() {
                match event {
                    DeviceEvent::DefaultInputChanged { .. }
                    | DeviceEvent::DefaultOutputChanged { .. } => {
                        let new_device = AudioInput::get_default_mic_name();
                        let _ = myself_clone.cast(SourceMsg::SetMicDevice(Some(new_device)));
                    }
                }
            }
        });

        let mic_device = args
            .device
            .or_else(|| Some(AudioInput::get_default_mic_name()));
        let silence_stream_tx = Some(hypr_audio::AudioOutput::silence());

        let mut st = SourceState {
            mic_device,
            token: args.token,
            mic_muted: Arc::new(AtomicBool::new(false)),
            spk_muted: Arc::new(AtomicBool::new(false)),
            run_task: None,
            stream_cancel_token: None,
            _device_monitor_handle: Some(device_monitor_handle),
            _silence_stream_tx: silence_stream_tx,
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
            SourceMsg::SetSpkMute(muted) => {
                st.spk_muted.store(muted, Ordering::Relaxed);
            }
            SourceMsg::GetSpkMute(reply) => {
                if !reply.is_closed() {
                    let _ = reply.send(st.spk_muted.load(Ordering::Relaxed));
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

        st._silence_stream_tx = None;

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
    let spk_muted = st.spk_muted.clone();
    let mic_device = st.mic_device.clone();

    let stream_cancel_token = CancellationToken::new();
    st.stream_cancel_token = Some(stream_cancel_token.clone());

    #[cfg(target_os = "macos")]
    let use_mixed = !AudioInput::is_using_headphone();

    #[cfg(not(target_os = "macos"))]
    let use_mixed = false;

    let handle = if use_mixed {
        #[cfg(target_os = "macos")]
        {
            tokio::spawn(async move {
                let mixed_stream = {
                    let mut mixed_input = AudioInput::from_mixed().unwrap();
                    ResampledAsyncSource::new(mixed_input.stream(), SAMPLE_RATE)
                        .chunks(AEC_BLOCK_SIZE)
                };

                tokio::pin!(mixed_stream);

                loop {
                    let Some(cell) = registry::where_is(ProcessorActor::name()) else {
                        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                        continue;
                    };
                    let proc: ActorRef<ProcMsg> = cell.into();

                    tokio::select! {
                        _ = token.cancelled() => {
                            drop(mixed_stream);
                            myself2.stop(None);
                            return;
                        }
                        _ = stream_cancel_token.cancelled() => {
                            drop(mixed_stream);
                            return;
                        }
                        mixed_next = mixed_stream.next() => {
                            if let Some(data) = mixed_next {
                                // TODO: should be able to mute each stream
                                let output_data = if mic_muted.load(Ordering::Relaxed) && spk_muted.load(Ordering::Relaxed) {
                                    vec![0.0; data.len()]
                                } else {
                                    data
                                };

                                let msg = ProcMsg::Mixed(AudioChunk{ data: output_data });
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
                ResampledAsyncSource::new(mic_input.stream(), SAMPLE_RATE).chunks(AEC_BLOCK_SIZE)
            };

            let spk_stream = {
                let mut spk_input = hypr_audio::AudioInput::from_speaker();
                ResampledAsyncSource::new(spk_input.stream(), SAMPLE_RATE).chunks(AEC_BLOCK_SIZE)
            };

            tokio::pin!(mic_stream);
            tokio::pin!(spk_stream);

            loop {
                let Some(cell) = registry::where_is(ProcessorActor::name()) else {
                    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
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
                            let output_data = if spk_muted.load(Ordering::Relaxed) {
                                vec![0.0; data.len()]
                            } else {
                                data
                            };

                            let msg = ProcMsg::Speaker(AudioChunk{ data: output_data });
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
