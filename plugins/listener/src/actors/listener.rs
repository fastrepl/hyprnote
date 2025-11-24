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
    ChangeMode(crate::actors::ChannelMode),
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
    pub use_dual_split_ws: bool,
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
                if state.args.mode == crate::actors::ChannelMode::Single {
                    response.remap_channel_index(0, 2);
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

            ListenerMsg::ChangeMode(new_mode) => {
                tracing::info!(?new_mode, "listener_mode_change");

                if let Some(shutdown_tx) = state.shutdown_tx.take() {
                    let _ = shutdown_tx.send(());
                    let _ = (&mut state.rx_task).await;
                }

                state.args.mode = new_mode;

                let (tx, rx_task, shutdown_tx) =
                    spawn_rx_task(state.args.clone(), myself.clone()).await?;
                state.tx = tx;
                state.rx_task = rx_task;
                state.shutdown_tx = Some(shutdown_tx);
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
    if args.mode == crate::actors::ChannelMode::Single {
        spawn_rx_task_single(args, myself).await
    } else if args.use_dual_split_ws {
        spawn_rx_task_dual_split(args, myself).await
    } else {
        spawn_rx_task_dual(args, myself).await
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
        let client = owhisper_client::ListenClient::builder()
            .api_base(args.base_url.clone())
            .api_key(args.api_key.clone())
            .params(build_listen_params(&args))
            .build_single();

        let outbound = tokio_stream::wrappers::ReceiverStream::new(rx);

        let (listen_stream, handle) = match client.from_realtime_audio(outbound).await {
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
        let client = owhisper_client::ListenClient::builder()
            .api_base(args.base_url.clone())
            .api_key(args.api_key.clone())
            .params(build_listen_params(&args))
            .build_dual();

        let outbound = tokio_stream::wrappers::ReceiverStream::new(rx);

        let (listen_stream, handle) = match client.from_realtime_audio(outbound).await {
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
            session_offset_secs,
            extra,
            None,
        )
        .await;
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
            let mic_client = owhisper_client::ListenClient::builder()
                .api_base(args_mic.base_url.clone())
                .api_key(args_mic.api_key.clone())
                .params(build_listen_params(&args_mic))
                .build_single();

            let mic_outbound = tokio_stream::wrappers::ReceiverStream::new(mic_rx);

            let (mic_stream, mic_handle) = match mic_client.from_realtime_audio(mic_outbound).await
            {
                Ok(res) => res,
                Err(e) => {
                    let _ =
                        myself_mic.send_message(ListenerMsg::StreamStartFailed(format!("{:?}", e)));
                    return;
                }
            };
            futures_util::pin_mut!(mic_stream);

            process_stream(
                mic_stream,
                mic_handle,
                myself_mic,
                shutdown_rx_mic,
                session_offset_secs,
                extra_mic,
                Some(0),
            )
            .await;
        });

        let spk_task = tokio::spawn(async move {
            let spk_client = owhisper_client::ListenClient::builder()
                .api_base(args_spk.base_url.clone())
                .api_key(args_spk.api_key.clone())
                .params(build_listen_params(&args_spk))
                .build_single();

            let spk_outbound = tokio_stream::wrappers::ReceiverStream::new(spk_rx);

            let (spk_stream, spk_handle) = match spk_client.from_realtime_audio(spk_outbound).await
            {
                Ok(res) => res,
                Err(e) => {
                    let _ =
                        myself_spk.send_message(ListenerMsg::StreamStartFailed(format!("{:?}", e)));
                    return;
                }
            };
            futures_util::pin_mut!(spk_stream);

            process_stream(
                spk_stream,
                spk_handle,
                myself_spk,
                shutdown_rx_spk,
                session_offset_secs,
                extra_spk,
                Some(1),
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
                                let _ = mic_tx.try_send(MixedMessage::Control(ctrl.clone()));
                                let _ = spk_tx.try_send(MixedMessage::Control(ctrl));
                            }
                            None => {
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
    channel_override: Option<i32>,
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
                                    if let Some(channel_idx) = channel_override {
                                        response.remap_channel_index(0, channel_idx);
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
                        if let Some(channel_idx) = channel_override {
                            response.remap_channel_index(0, channel_idx);
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
