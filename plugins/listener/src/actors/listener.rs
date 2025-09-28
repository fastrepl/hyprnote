use std::collections::HashMap;
use std::time::Duration;

use bytes::Bytes;
use futures_util::StreamExt;

use owhisper_interface::{ControlMessage, MixedMessage, Word2};
use ractor::{Actor, ActorName, ActorProcessingErr, ActorRef, SupervisionEvent};
use tauri_specta::Event;

use crate::{
    manager::{TranscriptManager, WordsByChannel},
    SessionEvent,
};

// Not too short to support non-realtime pipelines like whisper.cpp
const LISTEN_STREAM_TIMEOUT: Duration = Duration::from_secs(15 * 60);

pub enum ListenerMsg {
    Audio(Bytes, Bytes),
    StreamResponse(owhisper_interface::StreamResponse),
    StreamError(String),
    StreamEnded,
    StreamTimeout,
    StreamStartFailed(String),
}

#[derive(Clone)]
pub struct ListenerArgs {
    pub app: tauri::AppHandle,
    pub session_id: String,
    pub languages: Vec<hypr_language::Language>,
    pub onboarding: bool,
    pub partial_words_by_channel: WordsByChannel,
}

pub struct ListenerState {
    pub args: ListenerArgs,
    pub manager: TranscriptManager,
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
        {
            use tauri_plugin_local_stt::LocalSttPluginExt;
            let r = args.app.start_server(None).await;
            tracing::info!("{:?}", r);
        }

        let current_timestamp_ms = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;

        let manager = TranscriptManager::builder()
            .with_manager_offset(current_timestamp_ms)
            .with_existing_partial_words(args.partial_words_by_channel.clone())
            .build();

        let (tx, rx_task, shutdown_tx) = spawn_rx_task(args.clone(), myself).await?;

        let state = ListenerState {
            args,
            tx,
            rx_task,
            shutdown_tx: Some(shutdown_tx),
            manager,
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
                let diff = state.manager.append(response);

                let partial_words_by_channel: HashMap<usize, Vec<Word2>> = diff
                    .partial_words
                    .iter()
                    .map(|(channel_idx, words)| {
                        (
                            *channel_idx,
                            words
                                .iter()
                                .map(|w| Word2::from(w.clone()))
                                .collect::<Vec<_>>(),
                        )
                    })
                    .collect();

                SessionEvent::PartialWords {
                    words: partial_words_by_channel,
                }
                .emit(&state.args.app)?;

                let final_words_by_channel: HashMap<usize, Vec<Word2>> = diff
                    .final_words
                    .iter()
                    .map(|(channel_idx, words)| {
                        (
                            *channel_idx,
                            words
                                .iter()
                                .map(|w| Word2::from(w.clone()))
                                .collect::<Vec<_>>(),
                        )
                    })
                    .collect();

                update_session(
                    &state.args.app,
                    &state.args.session_id,
                    final_words_by_channel
                        .clone()
                        .values()
                        .flatten()
                        .cloned()
                        .collect(),
                )
                .await
                .unwrap();

                SessionEvent::FinalWords {
                    words: final_words_by_channel,
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

            ListenerMsg::StreamTimeout => {
                tracing::info!("listen_stream_timeout");
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

    let app = args.app.clone();

    let conn = {
        use tauri_plugin_local_stt::LocalSttPluginExt;
        app.get_connection().await?
    };

    let client = owhisper_client::ListenClient::builder()
        .api_base(conn.base_url)
        .api_key(conn.api_key.unwrap_or_default())
        .params(owhisper_interface::ListenParams {
            model: conn.model,
            languages: args.languages,
            redemption_time_ms: Some(if args.onboarding { 60 } else { 400 }),
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
                        Err(_) => {
                            let _ = myself.send_message(ListenerMsg::StreamTimeout);
                            break;
                        }
                    }
                }
            }
        }
    });

    Ok((tx, rx_task, shutdown_tx))
}

async fn update_session<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    session_id: impl Into<String>,
    words: Vec<Word2>,
) -> Result<Vec<Word2>, crate::Error> {
    use tauri_plugin_db::DatabasePluginExt;

    let mut session = app
        .db_get_session(session_id)
        .await?
        .ok_or(crate::Error::NoneSession)?;

    session.words.extend(words);
    app.db_upsert_session(session.clone()).await.unwrap();

    Ok(session.words)
}
