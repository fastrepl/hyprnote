use bytes::Bytes;
use std::time::Duration;

use futures_util::StreamExt;
use tokio::time::error::Elapsed;

use owhisper_interface::{ControlMessage, MixedMessage};
use ractor::{Actor, ActorName, ActorProcessingErr, ActorRef, SupervisionEvent};
use tauri_specta::Event;

use crate::SessionEvent;

// Not too short to support non-realtime pipelines like whisper.cpp
const LISTEN_STREAM_TIMEOUT: Duration = Duration::from_secs(15 * 60);

pub enum ListenerMsg {
    Audio(Bytes, Bytes),
    StreamResponse(owhisper_interface::StreamResponse),
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
}

pub struct ListenerState {
    pub args: ListenerArgs,
    tx: tokio::sync::mpsc::Sender<MixedMessage<(Bytes, Bytes), ControlMessage>>,
    rx_task: tokio::task::JoinHandle<()>,
    shutdown_tx: Option<tokio::sync::oneshot::Sender<()>>,
}

pub struct ListenerActor;

impl ListenerActor {
    pub fn name() -> ActorName {
        "listener_actor".into()
    }
}

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
        }
        state.rx_task.abort();
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

            ListenerMsg::StreamResponse(response) => {
                SessionEvent::StreamResponse { response }.emit(&state.args.app)?;
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
    let (shutdown_tx, mut shutdown_rx) = tokio::sync::oneshot::channel::<()>();

    let client = owhisper_client::ListenClient::builder()
        .api_base(args.base_url)
        .api_key(args.api_key)
        .params(owhisper_interface::ListenParams {
            model: Some(args.model),
            languages: args.languages,
            redemption_time_ms: Some(if args.onboarding { 60 } else { 400 }),
            keywords: args.keywords,
            ..Default::default()
        })
        .build_dual();

    let rx_task = tokio::spawn(async move {
        let outbound = tokio_stream::wrappers::ReceiverStream::new(rx);
        let (listen_stream, handle) = match client.from_realtime_audio(outbound).await {
            Ok(res) => res,
            Err(e) => {
                let _ = myself.send_message(ListenerMsg::StreamStartFailed(format!("{:?}", e)));
                return;
            }
        };
        futures_util::pin_mut!(listen_stream);

        loop {
            tokio::select! {
                _ = &mut shutdown_rx => {
                    handle.finalize_with_text(serde_json::json!({"type": "Finalize"}).to_string().into()).await;
                    break;
                }
                result = tokio::time::timeout(LISTEN_STREAM_TIMEOUT, listen_stream.next()) => {
                    match result {
                        Ok(Some(Ok(response))) => {
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
    });

    Ok((tx, rx_task, shutdown_tx))
}
