use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

use futures_util::StreamExt;
use ractor::{Actor, ActorName, ActorProcessingErr, ActorRef, RpcReplyPort};
use tokio_util::sync::CancellationToken;

use crate::actors::{AudioChunk, ProcMsg};
use hypr_audio::{
    AudioInput, DeviceEvent, DeviceMonitor, DeviceMonitorHandle, ResampledAsyncSource,
};

const SAMPLE_RATE: u32 = 16000;

pub enum MicCtrl {
    SetMute(bool),
    GetMute(RpcReplyPort<bool>),
    SetDevice(Option<String>),
    GetDevice(RpcReplyPort<Option<String>>),
}

pub struct MicArgs {
    pub device: Option<String>,
    pub proc: ActorRef<ProcMsg>,
    pub token: CancellationToken,
}

pub struct MicState {
    device: Option<String>,
    proc: ActorRef<ProcMsg>,
    token: CancellationToken,
    muted: Arc<AtomicBool>,
    run_task: Option<tokio::task::JoinHandle<()>>,
    stream_cancel_token: Option<CancellationToken>,
    _device_monitor_handle: Option<DeviceMonitorHandle>,
}

pub struct MicSourceActor;

impl MicSourceActor {
    pub fn name() -> ActorName {
        "source_mic".into()
    }
}

impl Actor for MicSourceActor {
    type Msg = MicCtrl;
    type State = MicState;
    type Arguments = MicArgs;

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
                if let DeviceEvent::DefaultInputChanged { .. } = event {
                    let new_device = AudioInput::get_default_mic_device_name();
                    let _ = myself_clone.cast(MicCtrl::SetDevice(Some(new_device)));
                }
            }
        });

        let device = AudioInput::get_default_mic_device_name();

        let mut st = MicState {
            device: Some(device),
            proc: args.proc,
            token: args.token,
            muted: Arc::new(AtomicBool::new(false)),
            run_task: None,
            stream_cancel_token: None,
            _device_monitor_handle: Some(device_monitor_handle),
        };

        start_mic_loop(&myself, &mut st).await?;
        Ok(st)
    }

    async fn handle(
        &self,
        myself: ActorRef<Self::Msg>,
        msg: Self::Msg,
        st: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        match msg {
            MicCtrl::SetMute(muted) => {
                st.muted.store(muted, Ordering::Relaxed);
            }
            MicCtrl::GetMute(reply) => {
                if !reply.is_closed() {
                    let _ = reply.send(st.muted.load(Ordering::Relaxed));
                }
            }
            MicCtrl::GetDevice(reply) => {
                if !reply.is_closed() {
                    let _ = reply.send(st.device.clone());
                }
            }
            MicCtrl::SetDevice(dev) => {
                st.device = dev;

                if let Some(cancel_token) = st.stream_cancel_token.take() {
                    cancel_token.cancel();
                }

                if let Some(t) = st.run_task.take() {
                    t.abort();
                }
                start_mic_loop(&myself, st).await?;
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

async fn start_mic_loop(
    myself: &ActorRef<MicCtrl>,
    st: &mut MicState,
) -> Result<(), ActorProcessingErr> {
    let myself2 = myself.clone();

    let proc = st.proc.clone();
    let token = st.token.clone();
    let muted = st.muted.clone();

    let stream_cancel_token = CancellationToken::new();
    st.stream_cancel_token = Some(stream_cancel_token.clone());

    let mut input = hypr_audio::AudioInput::from_mic(st.device.clone()).unwrap();
    let stream =
        ResampledAsyncSource::new(input.stream(), SAMPLE_RATE).chunks(hypr_aec::BLOCK_SIZE);

    let handle = tokio::spawn(async move {
        tokio::pin!(stream);

        loop {
            tokio::select! {
                _ = token.cancelled() => {
                    drop(stream);
                    myself2.stop(None);
                    return ();
                }
                _ = stream_cancel_token.cancelled() => {
                    drop(stream);
                    return ();
                }
                next = stream.next() => {
                    if let Some(data) = next {
                        let output_data = if muted.load(Ordering::Relaxed) {
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
            }
        }
    });

    st.run_task = Some(handle);
    Ok(())
}
