use futures_util::StreamExt;
use ractor::{Actor, ActorProcessingErr, ActorRef};
use std::time::Duration;
use tokio_util::sync::CancellationToken;

use crate::actors::{AudioChunk, ProcMsg};
use hypr_audio::ResampledAsyncSource;

const SAMPLE_RATE: u32 = 16000;

pub enum SrcCtrl {
    ChangeDevice(Option<String>),
    Stop,
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
    run_task: Option<tokio::task::JoinHandle<()>>,
}

pub struct SourceActor;
impl Actor for SourceActor {
    type Msg = SrcCtrl;
    type State = SrcState;
    type Arguments = SrcArgs;

    fn pre_start(
        &self,
        myself: ActorRef<Self::Msg>,
        args: Self::Arguments,
    ) -> impl std::future::Future<Output = Result<Self::State, ActorProcessingErr>> + Send {
        async move {
            let mut st = SrcState {
                which: args.which,
                proc: args.proc,
                token: args.token,
                run_task: None,
            };
            start_source_loop(&myself, &mut st).await?;
            Ok(st)
        }
    }

    fn handle(
        &self,
        myself: ActorRef<Self::Msg>,
        msg: Self::Msg,
        st: &mut Self::State,
    ) -> impl std::future::Future<Output = Result<(), ActorProcessingErr>> + Send {
        async move {
            match (msg, &mut st.which) {
                (SrcCtrl::ChangeDevice(dev), SrcWhich::Mic { device }) => {
                    *device = dev;
                    if let Some(t) = st.run_task.take() {
                        t.abort();
                    }
                    start_source_loop(&myself, st).await?;
                }
                (SrcCtrl::Stop, _) => {
                    myself.stop(None);
                }
                _ => {}
            }
            Ok(())
        }
    }
}

async fn start_source_loop(
    myself: &ActorRef<SrcCtrl>,
    st: &mut SrcState,
) -> Result<(), ActorProcessingErr> {
    let proc = st.proc.clone();
    let token = st.token.clone();
    let which = st.which.clone();
    let myself2 = myself.clone();

    let handle = tokio::spawn(async move {
        let mut seq: u64 = 0;
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
                            let msg = match &which {
                                SrcWhich::Mic {..} => ProcMsg::Mic(AudioChunk{ seq, data }),
                                SrcWhich::Speaker => ProcMsg::Spk(AudioChunk{ seq, data }),
                            };
                            let _ = proc.cast(msg);
                            seq = seq.wrapping_add(1);
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
