use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

use futures_util::StreamExt;
use ractor::{Actor, ActorName, ActorProcessingErr, ActorRef, RpcReplyPort};
use tokio_util::sync::CancellationToken;

use crate::actors::{AudioChunk, ProcMsg};
use hypr_audio::ResampledAsyncSource;

const SAMPLE_RATE: u32 = 16000;

pub enum SpkCtrl {
    SetMute(bool),
    GetMute(RpcReplyPort<bool>),
}

pub struct SpkArgs {
    pub proc: ActorRef<ProcMsg>,
    pub token: CancellationToken,
}

pub struct SpkState {
    proc: ActorRef<ProcMsg>,
    token: CancellationToken,
    muted: Arc<AtomicBool>,
    run_task: Option<tokio::task::JoinHandle<()>>,
    stream_cancel_token: Option<CancellationToken>,
    _silence_stream_tx: Option<std::sync::mpsc::Sender<()>>,
}

pub struct SpeakerSourceActor;

impl SpeakerSourceActor {
    pub fn name() -> ActorName {
        "source_spk".into()
    }
}

impl Actor for SpeakerSourceActor {
    type Msg = SpkCtrl;
    type State = SpkState;
    type Arguments = SpkArgs;

    async fn pre_start(
        &self,
        myself: ActorRef<Self::Msg>,
        args: Self::Arguments,
    ) -> Result<Self::State, ActorProcessingErr> {
        let silence_stream_tx = Some(hypr_audio::AudioOutput::silence());

        let mut st = SpkState {
            proc: args.proc,
            token: args.token,
            muted: Arc::new(AtomicBool::new(false)),
            run_task: None,
            stream_cancel_token: None,
            _silence_stream_tx: silence_stream_tx,
        };

        start_speaker_loop(&myself, &mut st).await?;
        Ok(st)
    }

    async fn handle(
        &self,
        _myself: ActorRef<Self::Msg>,
        msg: Self::Msg,
        st: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        match msg {
            SpkCtrl::SetMute(muted) => {
                st.muted.store(muted, Ordering::Relaxed);
            }
            SpkCtrl::GetMute(reply) => {
                if !reply.is_closed() {
                    let _ = reply.send(st.muted.load(Ordering::Relaxed));
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

        st._silence_stream_tx = None;

        Ok(())
    }
}

async fn start_speaker_loop(
    myself: &ActorRef<SpkCtrl>,
    st: &mut SpkState,
) -> Result<(), ActorProcessingErr> {
    let myself2 = myself.clone();

    let proc = st.proc.clone();
    let token = st.token.clone();
    let muted = st.muted.clone();

    let stream_cancel_token = CancellationToken::new();
    st.stream_cancel_token = Some(stream_cancel_token.clone());

    let handle = tokio::spawn(async move {
        loop {
            let input = hypr_audio::AudioInput::from_speaker().stream();
            let stream = ResampledAsyncSource::new(input, SAMPLE_RATE).chunks(hypr_aec::BLOCK_SIZE);

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

                            let msg = ProcMsg::Spk(AudioChunk{ data: output_data });
                            let _ = proc.cast(msg);
                        } else {
                            break;
                        }
                    }
                }
            }
        }
    });

    st.run_task = Some(handle);
    Ok(())
}
