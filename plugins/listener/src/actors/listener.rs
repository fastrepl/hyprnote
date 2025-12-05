use bytes::Bytes;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use futures_util::StreamExt;
use tokio::time::error::Elapsed;

use owhisper_client::{
    AdapterKind, ArgmaxAdapter, AssemblyAIAdapter, DeepgramAdapter, FinalizeHandle,
    FireworksAdapter, OpenAIAdapter, RealtimeSttAdapter, SonioxAdapter,
};
use owhisper_interface::stream::{Extra, StreamResponse};
use owhisper_interface::{ControlMessage, MixedMessage};
use ractor::{Actor, ActorName, ActorProcessingErr, ActorRef, SupervisionEvent};
use tauri_specta::Event;

use crate::SessionEvent;

const LISTEN_STREAM_TIMEOUT: Duration = Duration::from_secs(15 * 60);
const LISTEN_CONNECT_TIMEOUT: Duration = Duration::from_secs(5);

pub enum ListenerMsg {
    AudioSingle(Bytes),
    AudioDual(Bytes, Bytes),
    StreamResponse(StreamResponse),
    StreamError(String),
    StreamEnded,
    StreamTimeout(Elapsed),
}

#[derive(Clone)]
pub struct ListenerArgs {
    pub app: tauri::AppHandle,
    pub languages: Vec<hypr_language::Language>,
    pub onboarding: bool,
    pub model: String,
    pub base_url: String,
    pub api_key: String,
    pub keywords: Vec<String>,
    pub mode: crate::actors::ChannelMode,
    pub session_started_at: Instant,
    pub session_started_at_unix: SystemTime,
    pub session_id: String,
}

pub struct ListenerState {
    pub args: ListenerArgs,
    tx: ChannelSender,
    rx_task: tokio::task::JoinHandle<()>,
    shutdown_tx: Option<tokio::sync::oneshot::Sender<()>>,
}

enum ChannelSender {
    Single(tokio::sync::mpsc::Sender<MixedMessage<Bytes, ControlMessage>>),
    Dual(tokio::sync::mpsc::Sender<MixedMessage<(Bytes, Bytes), ControlMessage>>),
}

pub struct ListenerActor;

impl ListenerActor {
    pub fn name() -> ActorName {
        "listener_actor".into()
    }
}

#[derive(Debug)]
struct ListenerInitError(String);

impl std::fmt::Display for ListenerInitError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl std::error::Error for ListenerInitError {}

fn actor_error(msg: impl Into<String>) -> ActorProcessingErr {
    Box::new(ListenerInitError(msg.into()))
}

#[ractor::async_trait]
impl Actor for ListenerActor {
    type Msg = ListenerMsg;
    type State = ListenerState;
    type Arguments = ListenerArgs;

    async fn pre_start(
        &self,
        myself: ActorRef<Self::Msg>,
        args: Self::Arguments,
    ) -> Result<Self::State, ActorProcessingErr> {
        let (tx, rx_task, shutdown_tx) = spawn_rx_task(args.clone(), myself).await?;

        let state = ListenerState {
            args,
            tx,
            rx_task,
            shutdown_tx: Some(shutdown_tx),
        };

        Ok(state)
    }

    async fn post_stop(
        &self,
        _myself: ActorRef<Self::Msg>,
        state: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        if let Some(shutdown_tx) = state.shutdown_tx.take() {
            let _ = shutdown_tx.send(());
            let _ = (&mut state.rx_task).await;
        }
        Ok(())
    }

    async fn handle(
        &self,
        myself: ActorRef<Self::Msg>,
        message: Self::Msg,
        state: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        match message {
            ListenerMsg::AudioSingle(audio) => {
                if let ChannelSender::Single(tx) = &state.tx {
                    let _ = tx.try_send(MixedMessage::Audio(audio));
                }
            }

            ListenerMsg::AudioDual(mic, spk) => {
                if let ChannelSender::Dual(tx) = &state.tx {
                    let _ = tx.try_send(MixedMessage::Audio((mic, spk)));
                }
            }

            ListenerMsg::StreamResponse(mut response) => {
                match state.args.mode {
                    crate::actors::ChannelMode::MicOnly => {
                        response.remap_channel_index(0, 2);
                    }
                    crate::actors::ChannelMode::SpeakerOnly => {
                        response.remap_channel_index(1, 2);
                    }
                    crate::actors::ChannelMode::MicAndSpeaker => {}
                }

                if let Err(error) = (SessionEvent::StreamResponse {
                    session_id: state.args.session_id.clone(),
                    response: Box::new(response),
                })
                .emit(&state.args.app)
                {
                    tracing::error!(?error, "stream_response_emit_failed");
                }
            }

            ListenerMsg::StreamError(error) => {
                tracing::info!("listen_stream_error: {}", error);
                myself.stop(None);
            }

            ListenerMsg::StreamEnded => {
                tracing::info!("listen_stream_ended");
                myself.stop(None);
            }

            ListenerMsg::StreamTimeout(elapsed) => {
                tracing::info!("listen_stream_timeout: {}", elapsed);
                myself.stop(None);
            }
        }
        Ok(())
    }

    async fn handle_supervisor_evt(
        &self,
        myself: ActorRef<Self::Msg>,
        message: SupervisionEvent,
        _state: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        tracing::info!("supervisor_event: {:?}", message);

        match message {
            SupervisionEvent::ActorStarted(_) | SupervisionEvent::ProcessGroupChanged(_) => {}
            SupervisionEvent::ActorTerminated(_, _, _) => {}
            SupervisionEvent::ActorFailed(_cell, _) => {
                myself.stop(None);
            }
        }
        Ok(())
    }
}

async fn spawn_rx_task(
    args: ListenerArgs,
    myself: ActorRef<ListenerMsg>,
) -> Result<
    (
        ChannelSender,
        tokio::task::JoinHandle<()>,
        tokio::sync::oneshot::Sender<()>,
    ),
    ActorProcessingErr,
> {
    let adapter_kind = AdapterKind::from_url_and_languages(&args.base_url, &args.languages);
    let is_dual = matches!(args.mode, crate::actors::ChannelMode::MicAndSpeaker);

    match (adapter_kind, is_dual) {
        (AdapterKind::Argmax, false) => {
            spawn_rx_task_single_with_adapter::<ArgmaxAdapter>(args, myself).await
        }
        (AdapterKind::Argmax, true) => {
            spawn_rx_task_dual_with_adapter::<ArgmaxAdapter>(args, myself).await
        }
        (AdapterKind::Soniox, false) => {
            spawn_rx_task_single_with_adapter::<SonioxAdapter>(args, myself).await
        }
        (AdapterKind::Soniox, true) => {
            spawn_rx_task_dual_with_adapter::<SonioxAdapter>(args, myself).await
        }
        (AdapterKind::Fireworks, false) => {
            spawn_rx_task_single_with_adapter::<FireworksAdapter>(args, myself).await
        }
        (AdapterKind::Fireworks, true) => {
            spawn_rx_task_dual_with_adapter::<FireworksAdapter>(args, myself).await
        }
        (AdapterKind::Deepgram, false) => {
            spawn_rx_task_single_with_adapter::<DeepgramAdapter>(args, myself).await
        }
        (AdapterKind::Deepgram, true) => {
            spawn_rx_task_dual_with_adapter::<DeepgramAdapter>(args, myself).await
        }
        (AdapterKind::AssemblyAI, false) => {
            spawn_rx_task_single_with_adapter::<AssemblyAIAdapter>(args, myself).await
        }
        (AdapterKind::AssemblyAI, true) => {
            spawn_rx_task_dual_with_adapter::<AssemblyAIAdapter>(args, myself).await
        }
        (AdapterKind::OpenAI, false) => {
            spawn_rx_task_single_with_adapter::<OpenAIAdapter>(args, myself).await
        }
        (AdapterKind::OpenAI, true) => {
            spawn_rx_task_dual_with_adapter::<OpenAIAdapter>(args, myself).await
        }
    }
}

fn build_listen_params(args: &ListenerArgs) -> owhisper_interface::ListenParams {
    owhisper_interface::ListenParams {
        model: Some(args.model.clone()),
        languages: args.languages.clone(),
        sample_rate: super::SAMPLE_RATE,
        redemption_time_ms: Some(if args.onboarding { 60 } else { 400 }),
        keywords: args.keywords.clone(),
        ..Default::default()
    }
}

fn build_extra(args: &ListenerArgs) -> (f64, Extra) {
    let session_offset_secs = args.session_started_at.elapsed().as_secs_f64();
    let started_unix_millis = args
        .session_started_at_unix
        .duration_since(UNIX_EPOCH)
        .unwrap_or(Duration::from_secs(0))
        .as_millis()
        .min(u64::MAX as u128) as u64;

    let extra = Extra {
        started_unix_millis,
    };

    (session_offset_secs, extra)
}

async fn spawn_rx_task_single_with_adapter<A: RealtimeSttAdapter>(
    args: ListenerArgs,
    myself: ActorRef<ListenerMsg>,
) -> Result<
    (
        ChannelSender,
        tokio::task::JoinHandle<()>,
        tokio::sync::oneshot::Sender<()>,
    ),
    ActorProcessingErr,
> {
    let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel::<()>();
    let (session_offset_secs, extra) = build_extra(&args);

    let (tx, rx) = tokio::sync::mpsc::channel::<MixedMessage<Bytes, ControlMessage>>(32);

    let client = owhisper_client::ListenClient::builder()
        .adapter::<A>()
        .api_base(args.base_url.clone())
        .api_key(args.api_key.clone())
        .params(build_listen_params(&args))
        .build_single();

    let outbound = tokio_stream::wrappers::ReceiverStream::new(rx);

    let connect_result =
        tokio::time::timeout(LISTEN_CONNECT_TIMEOUT, client.from_realtime_audio(outbound)).await;

    let (listen_stream, handle) = match connect_result {
        Err(_elapsed) => {
            tracing::error!(
                timeout_secs = LISTEN_CONNECT_TIMEOUT.as_secs_f32(),
                "listen_ws_connect_timeout(single)"
            );
            return Err(actor_error("listen_ws_connect_timeout"));
        }
        Ok(Err(e)) => {
            tracing::error!(error = ?e, "listen_ws_connect_failed(single)");
            return Err(actor_error(format!("listen_ws_connect_failed: {:?}", e)));
        }
        Ok(Ok(res)) => res,
    };

    let rx_task = tokio::spawn(async move {
        futures_util::pin_mut!(listen_stream);
        process_stream(
            listen_stream,
            handle,
            myself,
            shutdown_rx,
            session_offset_secs,
            extra,
        )
        .await;
    });

    Ok((ChannelSender::Single(tx), rx_task, shutdown_tx))
}

async fn spawn_rx_task_dual_with_adapter<A: RealtimeSttAdapter>(
    args: ListenerArgs,
    myself: ActorRef<ListenerMsg>,
) -> Result<
    (
        ChannelSender,
        tokio::task::JoinHandle<()>,
        tokio::sync::oneshot::Sender<()>,
    ),
    ActorProcessingErr,
> {
    let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel::<()>();
    let (session_offset_secs, extra) = build_extra(&args);

    let (tx, rx) = tokio::sync::mpsc::channel::<MixedMessage<(Bytes, Bytes), ControlMessage>>(32);

    let client = owhisper_client::ListenClient::builder()
        .adapter::<A>()
        .api_base(args.base_url.clone())
        .api_key(args.api_key.clone())
        .params(build_listen_params(&args))
        .build_dual();

    let outbound = tokio_stream::wrappers::ReceiverStream::new(rx);

    let connect_result =
        tokio::time::timeout(LISTEN_CONNECT_TIMEOUT, client.from_realtime_audio(outbound)).await;

    let (listen_stream, handle) = match connect_result {
        Err(_elapsed) => {
            tracing::error!(
                timeout_secs = LISTEN_CONNECT_TIMEOUT.as_secs_f32(),
                "listen_ws_connect_timeout(dual)"
            );
            return Err(actor_error("listen_ws_connect_timeout"));
        }
        Ok(Err(e)) => {
            tracing::error!(error = ?e, "listen_ws_connect_failed(dual)");
            return Err(actor_error(format!("listen_ws_connect_failed: {:?}", e)));
        }
        Ok(Ok(res)) => res,
    };

    let rx_task = tokio::spawn(async move {
        futures_util::pin_mut!(listen_stream);
        process_stream(
            listen_stream,
            handle,
            myself,
            shutdown_rx,
            session_offset_secs,
            extra,
        )
        .await;
    });

    Ok((ChannelSender::Dual(tx), rx_task, shutdown_tx))
}

async fn process_stream<S, E, H>(
    mut listen_stream: std::pin::Pin<&mut S>,
    handle: H,
    myself: ActorRef<ListenerMsg>,
    mut shutdown_rx: tokio::sync::oneshot::Receiver<()>,
    offset_secs: f64,
    extra: Extra,
) where
    S: futures_util::Stream<Item = Result<StreamResponse, E>>,
    E: std::fmt::Debug,
    H: FinalizeHandle,
{
    loop {
        tokio::select! {
            _ = &mut shutdown_rx => {
                handle.finalize().await;

                let finalize_timeout = tokio::time::sleep(Duration::from_secs(5));
                tokio::pin!(finalize_timeout);

                let expected_count = handle.expected_finalize_count();
                let mut finalize_count = 0usize;

                loop {
                    tokio::select! {
                        _ = &mut finalize_timeout => {
                            tracing::warn!(timeout = true, "break_timeout");
                            break;
                        }
                        result = listen_stream.next() => {
                            match result {
                                Some(Ok(mut response)) => {
                                    let is_from_finalize = if let StreamResponse::TranscriptResponse { from_finalize, .. } = &response {
                                        *from_finalize
                                    } else {
                                        false
                                    };

                                    if is_from_finalize {
                                        finalize_count += 1;
                                    }

                                    response.apply_offset(offset_secs);
                                    response.set_extra(&extra);

                                    if myself.send_message(ListenerMsg::StreamResponse(response)).is_err() {
                                        tracing::warn!("actor_gone_during_finalize");
                                        break;
                                    }

                                    if finalize_count >= expected_count {
                                        tracing::info!(finalize_count, expected_count, "break_from_finalize");
                                        break;
                                    }
                                }
                                Some(Err(e)) => {
                                    tracing::warn!(error = ?e, "break_from_finalize");
                                    break;
                                }
                                None => {
                                    tracing::info!(ended = true, "break_from_finalize");
                                    break;
                                }
                            }
                        }
                    }
                }
                break;
            }
            result = tokio::time::timeout(LISTEN_STREAM_TIMEOUT, listen_stream.next()) => {
                match result {
                    Ok(Some(Ok(mut response))) => {
                        response.apply_offset(offset_secs);
                        response.set_extra(&extra);

                        if myself.send_message(ListenerMsg::StreamResponse(response)).is_err() {
                            tracing::warn!("actor_gone_breaking_stream_loop");
                            break;
                        }
                    }
                    Ok(Some(Err(e))) => {
                        let _ = myself.send_message(ListenerMsg::StreamError(format!("{:?}", e)));
                        break;
                    }
                    Ok(None) => {
                        let _ = myself.send_message(ListenerMsg::StreamEnded);
                        break;
                    }
                    Err(elapsed) => {
                        let _ = myself.send_message(ListenerMsg::StreamTimeout(elapsed));
                        break;
                    }
                }
            }
        }
    }
}
