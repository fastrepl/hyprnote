use bytes::Bytes;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use futures_util::StreamExt;
use tokio::time::error::Elapsed;

use ractor::{Actor, ActorName, ActorProcessingErr, ActorRef, SupervisionEvent};
use ractor_supervisor::supervisor::SupervisorMsg;
use tauri_specta::Event;

use owhisper_client::hypr_ws;
use owhisper_interface::stream::{Extra, StreamResponse};
use owhisper_interface::{ControlMessage, MixedMessage};

use crate::SessionEvent;

// Not too short to support non-realtime pipelines like whisper.cpp
const LISTEN_STREAM_TIMEOUT: Duration = Duration::from_secs(15 * 60);

pub enum ListenerMsg {
    Audio(Bytes, Bytes),
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
    pub sample_rate: u32,
    pub supervisor: ActorRef<SupervisorMsg>,
    pub session_started_at: Instant,
    pub session_started_at_unix: SystemTime,
}

pub struct ListenerState {
    pub args: ListenerArgs,
    tx: tokio::sync::mpsc::Sender<MixedMessage<(Bytes, Bytes), ControlMessage>>,
    rx_task: tokio::task::JoinHandle<()>,
    shutdown_tx: Option<tokio::sync::oneshot::Sender<()>>,
    supervisor: ActorRef<SupervisorMsg>,
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
        tracing::info!(
            sample_rate = args.sample_rate,
            mode = ?args.mode,
            "listener_actor_pre_start"
        );
        let supervisor = args.supervisor.clone();
        let (tx, rx_task, shutdown_tx) = spawn_rx_task(args.clone(), myself).await?;

        let state = ListenerState {
            args,
            tx,
            rx_task,
            shutdown_tx: Some(shutdown_tx),
            supervisor,
        };

        Ok(state)
    }

    async fn post_stop(
        &self,
        _myself: ActorRef<Self::Msg>,
        state: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        tracing::info!("listener_actor_post_stop");
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
            ListenerMsg::Audio(mic, spk) => {
                let _ = state.tx.try_send(MixedMessage::Audio((mic, spk)));
            }

            ListenerMsg::StreamResponse(mut response) => {
                if state.args.mode == crate::actors::ChannelMode::Single {
                    response.remap_channel_index(0, 2);
                }

                if let StreamResponse::TranscriptResponse { is_final, .. } = &response {
                    if *is_final {
                        tracing::info!(response = ?response, "final_response");
                    }
                }

                SessionEvent::StreamResponse { response }.emit(&state.args.app)?;
            }

            ListenerMsg::StreamStartFailed(error) => {
                tracing::error!("listen_ws_connect_failed: {}", error);
                request_rest_for_one(
                    &state.supervisor,
                    ListenerActor::name(),
                    "stream_start_failed",
                );
                myself.stop(Some(format!("listen_ws_connect_failed: {}", error)));
            }

            ListenerMsg::StreamError(error) => {
                tracing::info!("listen_stream_error: {}", error);
                request_rest_for_one(&state.supervisor, ListenerActor::name(), "stream_error");
                myself.stop(None);
            }

            ListenerMsg::StreamEnded => {
                tracing::info!("listen_stream_ended");
                request_rest_for_one(&state.supervisor, ListenerActor::name(), "stream_ended");
                myself.stop(None);
            }

            ListenerMsg::StreamTimeout(elapsed) => {
                tracing::info!("listen_stream_timeout: {}", elapsed);
                request_rest_for_one(&state.supervisor, ListenerActor::name(), "stream_timeout");
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
        tracing::info!("listener_actor_supervision_event: {:?}", message);

        match message {
            SupervisionEvent::ActorStarted(_) | SupervisionEvent::ProcessGroupChanged(_) => {}
            SupervisionEvent::ActorTerminated(_, _, _) => {}
            SupervisionEvent::ActorFailed(_cell, _) => {
                tracing::error!("listener_actor_failed_event");
                myself.stop(None);
            }
        }
        Ok(())
    }
}

fn request_rest_for_one(
    supervisor: &ActorRef<SupervisorMsg>,
    child_id: ActorName,
    reason: &'static str,
) {
    let child_id_string = child_id.to_string();
    tracing::info!(
        child = child_id_string,
        reason,
        "requesting_rest_for_one_spawn_from_listener"
    );
    match supervisor.cast(SupervisorMsg::RestForOneSpawn {
        child_id: child_id_string.clone(),
    }) {
        Ok(_) => tracing::info!(
            child = child_id_string,
            reason,
            "requested_rest_for_one_spawn_from_listener"
        ),
        Err(error) => tracing::warn!(
            ?error,
            child = child_id_string,
            reason,
            "failed_to_request_rest_for_one_from_listener"
        ),
    }
}

async fn spawn_rx_task(
    args: ListenerArgs,
    myself: ActorRef<ListenerMsg>,
) -> Result<
    (
        tokio::sync::mpsc::Sender<MixedMessage<(Bytes, Bytes), ControlMessage>>,
        tokio::task::JoinHandle<()>,
        tokio::sync::oneshot::Sender<()>,
    ),
    ActorProcessingErr,
> {
    let (tx, rx) = tokio::sync::mpsc::channel::<MixedMessage<(Bytes, Bytes), ControlMessage>>(32);
    let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel::<()>();

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

    let rx_task = tokio::spawn(async move {
        use crate::actors::ChannelMode;

        let app_handle = args.app.clone();

        if args.mode == ChannelMode::Single {
            let client = owhisper_client::ListenClient::builder()
                .api_base(args.base_url.clone())
                .api_key(args.api_key.clone())
                .params(owhisper_interface::ListenParams {
                    model: Some(args.model.clone()),
                    sample_rate: args.sample_rate,
                    languages: args.languages.clone(),
                    redemption_time_ms: Some(if args.onboarding { 60 } else { 400 }),
                    keywords: args.keywords.clone(),
                    ..Default::default()
                })
                .build_single();

            let outbound = tokio_stream::StreamExt::map(
                tokio_stream::wrappers::ReceiverStream::new(rx),
                |msg| match msg {
                    MixedMessage::Audio((_mic, spk)) => MixedMessage::Audio(spk),
                    MixedMessage::Control(c) => MixedMessage::Control(c),
                },
            );

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
                app_handle.clone(),
                session_offset_secs,
                extra.clone(),
            )
            .await;
        } else {
            let client = owhisper_client::ListenClient::builder()
                .api_base(args.base_url)
                .api_key(args.api_key)
                .params(owhisper_interface::ListenParams {
                    model: Some(args.model),
                    sample_rate: args.sample_rate,
                    languages: args.languages,
                    redemption_time_ms: Some(if args.onboarding { 60 } else { 400 }),
                    keywords: args.keywords,
                    ..Default::default()
                })
                .build_dual();

            let outbound = tokio_stream::StreamExt::map(
                tokio_stream::wrappers::ReceiverStream::new(rx),
                |msg| match msg {
                    MixedMessage::Audio((mic, spk)) => {
                        MixedMessage::Audio((spk, bytes::Bytes::from(vec![0; mic.len()])))
                    }
                    MixedMessage::Control(c) => MixedMessage::Control(c),
                },
            );

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
                app_handle.clone(),
                session_offset_secs,
                extra.clone(),
            )
            .await;
        }
    });

    Ok((tx, rx_task, shutdown_tx))
}

async fn process_stream<S, E>(
    mut listen_stream: std::pin::Pin<&mut S>,
    handle: hypr_ws::client::WebSocketHandle,
    myself: ActorRef<ListenerMsg>,
    mut shutdown_rx: tokio::sync::oneshot::Receiver<()>,
    app: tauri::AppHandle,
    offset_secs: f64,
    extra: Extra,
) where
    S: futures_util::Stream<Item = Result<StreamResponse, E>>,
    E: std::fmt::Debug,
{
    loop {
        tokio::select! {
            _ = &mut shutdown_rx => {
                handle.finalize_with_text(serde_json::json!({"type": "Finalize"}).to_string().into()).await;

                if let Err(err) = (SessionEvent::Finalizing {}).emit(&app) {
                    tracing::warn!(?err, "failed_to_emit_finalizing");
                }

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
