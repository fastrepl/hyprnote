use bytes::Bytes;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use futures_util::StreamExt;
use tokio::time::error::Elapsed;

use owhisper_client::hypr_ws;
use owhisper_interface::stream::{Extra, StreamResponse};
use owhisper_interface::{ControlMessage, MixedMessage};
use ractor::{Actor, ActorName, ActorProcessingErr, ActorRef, SupervisionEvent};
use tauri_specta::Event;

use crate::SessionEvent;

// Not too short to support non-realtime pipelines like whisper.cpp
const LISTEN_STREAM_TIMEOUT: Duration = Duration::from_secs(15 * 60);

pub enum ListenerMsg {
    AudioSingle(Bytes),
    AudioDual(Bytes, Bytes),
    StreamResponse(StreamResponse),
    StreamError(String),
    StreamEnded,
    StreamTimeout(Elapsed),
    StreamStartFailed(String),
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
        // We should not call `state.rx_task.abort()` here.
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

                SessionEvent::StreamResponse {
                    session_id: state.args.session_id.clone(),
                    response,
                }
                .emit(&state.args.app)?;
            }

            ListenerMsg::StreamStartFailed(error) => {
                tracing::error!("listen_ws_connect_failed: {}", error);
                myself.stop(Some(format!("listen_ws_connect_failed: {}", error)));
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

fn is_local_stt_base_url(base_url: &str) -> bool {
    if let Ok(parsed) = url::Url::parse(base_url) {
        matches!(parsed.host_str(), Some("localhost" | "127.0.0.1" | "::1"))
    } else {
        base_url.contains("localhost") || base_url.contains("127.0.0.1")
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
    match args.mode {
        crate::actors::ChannelMode::MicOnly | crate::actors::ChannelMode::SpeakerOnly => {
            spawn_rx_task_single(args, myself).await
        }
        crate::actors::ChannelMode::MicAndSpeaker => {
            if is_local_stt_base_url(&args.base_url) {
                spawn_rx_task_dual_split(args, myself).await
            } else {
                spawn_rx_task_dual(args, myself).await
            }
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

async fn run_single_stream(
    args: ListenerArgs,
    myself: ActorRef<ListenerMsg>,
    rx: tokio::sync::mpsc::Receiver<MixedMessage<Bytes, ControlMessage>>,
    shutdown_rx: tokio::sync::oneshot::Receiver<()>,
    offset_secs: f64,
    extra: Extra,
    channel_override: Option<(i32, i32)>,
) {
    let client = owhisper_client::ListenClient::builder()
        .api_base(args.base_url.clone())
        .api_key(args.api_key.clone())
        .params(build_listen_params(&args))
        .build_single();

    let outbound = tokio_stream::wrappers::ReceiverStream::new(rx);

    let mut shutdown_rx = shutdown_rx;
    let res = tokio::select! {
        res = client.from_realtime_audio(outbound) => res,
        _ = &mut shutdown_rx => {
            return;
        }
    };

    let (listen_stream, handle) = match res {
        Ok(res) => res,
        Err(e) => {
            let _ = myself.send_message(ListenerMsg::StreamStartFailed(format!("{:?}", e)));
            return;
        }
    };
    futures_util::pin_mut!(listen_stream);

    process_stream(
        listen_stream,
        handle,
        myself,
        shutdown_rx,
        offset_secs,
        extra,
        channel_override,
    )
    .await;
}

async fn run_dual_stream(
    args: ListenerArgs,
    myself: ActorRef<ListenerMsg>,
    rx: tokio::sync::mpsc::Receiver<MixedMessage<(Bytes, Bytes), ControlMessage>>,
    shutdown_rx: tokio::sync::oneshot::Receiver<()>,
    offset_secs: f64,
    extra: Extra,
) {
    let client = owhisper_client::ListenClient::builder()
        .api_base(args.base_url.clone())
        .api_key(args.api_key.clone())
        .params(build_listen_params(&args))
        .build_dual();

    let outbound = tokio_stream::wrappers::ReceiverStream::new(rx);

    let mut shutdown_rx = shutdown_rx;
    let res = tokio::select! {
        res = client.from_realtime_audio(outbound) => res,
        _ = &mut shutdown_rx => {
            return;
        }
    };

    let (listen_stream, handle) = match res {
        Ok(res) => res,
        Err(e) => {
            let _ = myself.send_message(ListenerMsg::StreamStartFailed(format!("{:?}", e)));
            return;
        }
    };
    futures_util::pin_mut!(listen_stream);

    process_stream(
        listen_stream,
        handle,
        myself,
        shutdown_rx,
        offset_secs,
        extra,
        None,
    )
    .await;
}

async fn spawn_rx_task_single(
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

    let rx_task = tokio::spawn(async move {
        run_single_stream(
            args,
            myself,
            rx,
            shutdown_rx,
            session_offset_secs,
            extra,
            None,
        )
        .await;
    });

    Ok((ChannelSender::Single(tx), rx_task, shutdown_tx))
}

async fn spawn_rx_task_dual(
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

    let rx_task = tokio::spawn(async move {
        run_dual_stream(args, myself, rx, shutdown_rx, session_offset_secs, extra).await;
    });

    Ok((ChannelSender::Dual(tx), rx_task, shutdown_tx))
}

async fn spawn_rx_task_dual_split(
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
    let (shutdown_tx_global, shutdown_rx_global) = tokio::sync::oneshot::channel::<()>();
    let (session_offset_secs, extra) = build_extra(&args);

    let (tx, rx) = tokio::sync::mpsc::channel::<MixedMessage<(Bytes, Bytes), ControlMessage>>(32);

    let rx_task = tokio::spawn(async move {
        let (mic_tx, mic_rx) =
            tokio::sync::mpsc::channel::<MixedMessage<Bytes, ControlMessage>>(32);
        let (spk_tx, spk_rx) =
            tokio::sync::mpsc::channel::<MixedMessage<Bytes, ControlMessage>>(32);

        let (shutdown_tx_mic, shutdown_rx_mic) = tokio::sync::oneshot::channel::<()>();
        let (shutdown_tx_spk, shutdown_rx_spk) = tokio::sync::oneshot::channel::<()>();

        let myself_mic = myself.clone();
        let myself_spk = myself.clone();
        let extra_mic = extra.clone();
        let extra_spk = extra;
        let args_mic = args.clone();
        let args_spk = args;

        let mic_task = tokio::spawn(async move {
            run_single_stream(
                args_mic,
                myself_mic,
                mic_rx,
                shutdown_rx_mic,
                session_offset_secs,
                extra_mic,
                Some((0, 2)),
            )
            .await;
        });

        let spk_task = tokio::spawn(async move {
            run_single_stream(
                args_spk,
                myself_spk,
                spk_rx,
                shutdown_rx_spk,
                session_offset_secs,
                extra_spk,
                Some((1, 2)),
            )
            .await;
        });

        let forward_task = tokio::spawn(async move {
            let mut rx = rx;
            let mut shutdown_rx_global = shutdown_rx_global;

            loop {
                tokio::select! {
                    _ = &mut shutdown_rx_global => {
                        let _ = shutdown_tx_mic.send(());
                        let _ = shutdown_tx_spk.send(());
                        break;
                    }
                    msg = rx.recv() => {
                        match msg {
                            Some(MixedMessage::Audio((mic, spk))) => {
                                let _ = mic_tx.try_send(MixedMessage::Audio(mic));
                                let _ = spk_tx.try_send(MixedMessage::Audio(spk));
                            }
                            Some(MixedMessage::Control(ctrl)) => {
                                let _ = mic_tx.send(MixedMessage::Control(ctrl.clone())).await;
                                let _ = spk_tx.send(MixedMessage::Control(ctrl)).await;
                            }
                            None => {
                                let _ = shutdown_tx_mic.send(());
                                let _ = shutdown_tx_spk.send(());
                                break;
                            }
                        }
                    }
                }
            }
        });

        let _ = tokio::join!(mic_task, spk_task, forward_task);
    });

    Ok((ChannelSender::Dual(tx), rx_task, shutdown_tx_global))
}

async fn process_stream<S, E>(
    mut listen_stream: std::pin::Pin<&mut S>,
    handle: hypr_ws::client::WebSocketHandle,
    myself: ActorRef<ListenerMsg>,
    mut shutdown_rx: tokio::sync::oneshot::Receiver<()>,
    offset_secs: f64,
    extra: Extra,
    channel_override: Option<(i32, i32)>,
) where
    S: futures_util::Stream<Item = Result<StreamResponse, E>>,
    E: std::fmt::Debug,
{
    loop {
        tokio::select! {
            _ = &mut shutdown_rx => {
                handle.finalize_with_text(serde_json::json!({"type": "Finalize"}).to_string().into()).await;

                let finalize_timeout = tokio::time::sleep(Duration::from_secs(5));
                tokio::pin!(finalize_timeout);

                let mut received_from_finalize = false;

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
                                        received_from_finalize = true;
                                    }

                                    response.apply_offset(offset_secs);
                                    response.set_extra(&extra);
                                    if let Some((channel_idx, total_channels)) = channel_override {
                                        response.set_channel_index(channel_idx, total_channels);
                                    }

                                    let _ = myself.send_message(ListenerMsg::StreamResponse(response));

                                    if received_from_finalize {
                                        tracing::info!(from_finalize = true, "break_from_finalize");
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
                        if let Some((channel_idx, total_channels)) = channel_override {
                            response.set_channel_index(channel_idx, total_channels);
                        }

                        let _ = myself.send_message(ListenerMsg::StreamResponse(response));
                    }
                    // Something went wrong while sending or receiving a websocket message. Should restart.
                    Ok(Some(Err(e))) => {
                        let _ = myself.send_message(ListenerMsg::StreamError(format!("{:?}", e)));
                        break;
                    }
                     // Stream ended gracefully. Safe to stop the whole session.
                    Ok(None) => {
                        let _ = myself.send_message(ListenerMsg::StreamEnded);
                        break;
                    }
                    // We're not hearing back any transcript. Better to stop the whole session.
                    Err(elapsed) => {
                        let _ = myself.send_message(ListenerMsg::StreamTimeout(elapsed));
                        break;
                    }
                }
            }
        }
    }
}
