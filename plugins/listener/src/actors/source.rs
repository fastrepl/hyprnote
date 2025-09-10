use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;

use futures_util::StreamExt;
use ractor::{Actor, ActorProcessingErr, ActorRef, RpcReplyPort};
use tokio_util::sync::CancellationToken;

use crate::actors::{AudioChunk, ProcMsg};
use hypr_audio::{
    AudioInput, DeviceEvent, DeviceMonitor, DeviceMonitorHandle, ResampledAsyncSource,
};

const SAMPLE_RATE: u32 = 16000;

pub enum SrcCtrl {
    SetMute(bool),
    GetMute(RpcReplyPort<bool>),
    SetDevice(Option<String>),
    GetDevice(RpcReplyPort<Option<String>>),
}

#[derive(Clone)]
pub enum SrcWhich {
    Mic { device: Option<String> },
    Speaker,
}

pub struct SrcArgs {
    pub which: SrcWhich,
    pub proc: ActorRef<ProcMsg>,
    pub token: CancellationToken,
}

pub struct SrcState {
    which: SrcWhich,
    proc: ActorRef<ProcMsg>,
    token: CancellationToken,
    muted: Arc<AtomicBool>,
    run_task: Option<tokio::task::JoinHandle<()>>,
    _device_monitor_handle: Option<DeviceMonitorHandle>,
    _silence_stream_tx: Option<std::sync::mpsc::Sender<()>>,
}

pub struct SourceActor;
impl Actor for SourceActor {
    type Msg = SrcCtrl;
    type State = SrcState;
    type Arguments = SrcArgs;

    async fn pre_start(
        &self,
        myself: ActorRef<Self::Msg>,
        args: Self::Arguments,
    ) -> Result<Self::State, ActorProcessingErr> {
        let device_monitor_handle = if matches!(args.which, SrcWhich::Mic { .. }) {
            let (event_tx, event_rx) = std::sync::mpsc::channel();
            let device_monitor_handle = DeviceMonitor::spawn(event_tx);

            let myself_clone = myself.clone();
            std::thread::spawn(move || {
                while let Ok(event) = event_rx.recv() {
                    if let DeviceEvent::DefaultInputChanged { .. } = event {
                        let new_device = AudioInput::get_default_mic_device_name();
                        let _ = myself_clone.cast(SrcCtrl::SetDevice(Some(new_device)));
                    }
                }
            });

            Some(device_monitor_handle)
        } else {
            None
        };

        let silence_stream_tx = if matches!(args.which, SrcWhich::Speaker) {
            Some(hypr_audio::AudioOutput::silence())
        } else {
            None
        };

        let mut st = SrcState {
            which: args.which,
            proc: args.proc,
            token: args.token,
            muted: Arc::new(AtomicBool::new(false)),
            run_task: None,
            _device_monitor_handle: device_monitor_handle,
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
        match (msg, &mut st.which) {
            (SrcCtrl::SetMute(muted), _) => {
                st.muted.store(muted, Ordering::Relaxed);
            }
            (SrcCtrl::GetMute(reply), _) => {
                if !reply.is_closed() {
                    let _ = reply.send(st.muted.load(Ordering::Relaxed));
                }
            }
            (SrcCtrl::GetDevice(reply), _) => {
                if !reply.is_closed() {
                    let device = match &st.which {
                        SrcWhich::Mic { device } => device.clone(),
                        SrcWhich::Speaker => None,
                    };
                    let _ = reply.send(device);
                }
            }
            (SrcCtrl::SetDevice(dev), SrcWhich::Mic { device }) => {
                *device = dev;
                if let Some(t) = st.run_task.take() {
                    t.abort();
                }
                start_source_loop(&myself, st).await?;
            }
            _ => {}
        }

        Ok(())
    }

    async fn post_stop(
        &self,
        _myself: ActorRef<Self::Msg>,
        st: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        if let Some(task) = st.run_task.take() {
            task.abort();
        }

        st._silence_stream_tx = None;

        Ok(())
    }
}

async fn start_source_loop(
    myself: &ActorRef<SrcCtrl>,
    st: &mut SrcState,
) -> Result<(), ActorProcessingErr> {
    let myself2 = myself.clone();

    let proc = st.proc.clone();
    let token = st.token.clone();
    let which = st.which.clone();
    let muted = st.muted.clone();

    let handle = tokio::spawn(async move {
        loop {
            let stream = match &which {
                SrcWhich::Mic { device } => {
                    let mut input = hypr_audio::AudioInput::from_mic(device.clone()).unwrap();

                    ResampledAsyncSource::new(input.stream(), SAMPLE_RATE)
                        .chunks(hypr_aec::BLOCK_SIZE)
                }
                SrcWhich::Speaker => {
                    let input = hypr_audio::AudioInput::from_speaker().stream();
                    ResampledAsyncSource::new(input, SAMPLE_RATE).chunks(hypr_aec::BLOCK_SIZE)
                }
            };
            tokio::pin!(stream);

            loop {
                tokio::select! {
                    _ = token.cancelled() => { myself2.stop(None); return (); }
                    next = stream.next() => {
                        if let Some(data) = next {
                            let output_data = if muted.load(Ordering::Relaxed) {
                                vec![0.0; data.len()]
                            } else {
                                data
                            };

                            let msg = match &which {
                                SrcWhich::Mic {..} => ProcMsg::Mic(AudioChunk{ data: output_data }),
                                SrcWhich::Speaker => ProcMsg::Spk(AudioChunk{ data: output_data }),
                            };
                            let _ = proc.cast(msg);
                        } else {
                            break;
                        }
                    }
                }
            }
            tokio::time::sleep(Duration::from_millis(200)).await;
        }
    });

    st.run_task = Some(handle);
    Ok(())
}
