use std::collections::HashMap;
use std::time::Duration;

use bytes::Bytes;
use futures_util::StreamExt;

use owhisper_interface::{ControlMessage, MixedMessage, Word2};
use ractor::{Actor, ActorName, ActorProcessingErr, ActorRef, SupervisionEvent};
use tauri_specta::Event;

use crate::{manager::TranscriptManager, SessionEvent};

// Not too short to support non-realtime pipelines like whisper.cpp
const LISTEN_STREAM_TIMEOUT: Duration = Duration::from_secs(15 * 60);

pub enum ListenerMsg {
    Audio(Bytes, Bytes),
}

pub struct ListenerArgs {
    pub app: tauri::AppHandle,
    pub session_id: String,
    pub languages: Vec<hypr_language::Language>,
    pub onboarding: bool,
    pub session_start_ts_ms: u64,
}

pub struct ListenerState {
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

        let (tx, rx_task, shutdown_tx) = spawn_rx_task(args, myself).await.unwrap();
        let state = ListenerState {
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
        _myself: ActorRef<Self::Msg>,
        message: Self::Msg,
        state: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        match message {
            ListenerMsg::Audio(mic, spk) => {
                let _ = state.tx.try_send(MixedMessage::Audio((mic, spk)));
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
    let session_id = args.session_id.clone();
    let session_start_ts_ms = args.session_start_ts_ms;

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
                tracing::error!("listen_ws_connect_failed: {:?}", e);
                myself.stop(Some(format!("listen_ws_connect_failed: {:?}", e)));
                return;
            }
        };
        futures_util::pin_mut!(listen_stream);

        let mut manager = TranscriptManager::builder()
            .with_unix_timestamp(session_start_ts_ms)
            .build();

        loop {
            tokio::select! {
                _ = &mut shutdown_rx => {
                    handle.finalize_with_text(serde_json::json!({"type": "Finalize"}).to_string().into()).await;
                    break;
                }
                result = tokio::time::timeout(LISTEN_STREAM_TIMEOUT, listen_stream.next()) => {
                    match result {
                        Ok(Some(Ok(response))) => {
                            let diff = manager.append(response.clone());

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
                            .emit(&app)
                            .unwrap();

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
                                &app,
                                &session_id,
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
                            .emit(&app)
                            .unwrap();
                        }
                        // Something went wrong while sending or receiving a websocket message. Should restart.
                        Ok(Some(Err(e))) => {
                            tracing::info!("listen_stream_error: {:?}", e);
                            break;
                        }
                        // Stream ended gracefully. Safe to stop the whole session.
                        Ok(None) => {
                            tracing::info!("listen_stream_ended");
                            break;
                        }
                        // We're not hearing back any transcript. Better to stop the whole session.
                        Err(_) => {
                            tracing::info!("listen_stream_timeout");
                            break;
                        }
                    }
                }
            }
        }

        myself.stop(None);
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
