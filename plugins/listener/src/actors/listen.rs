use std::collections::HashMap;
use std::time::Duration;

use bytes::Bytes;
use futures_util::StreamExt;

use owhisper_interface::{ControlMessage, MixedMessage, Word2};
use ractor::{Actor, ActorName, ActorProcessingErr, ActorRef};
use tauri_specta::Event;

use crate::{manager::TranscriptManager, SessionEvent};

const LISTEN_STREAM_TIMEOUT: Duration = Duration::from_secs(60 * 15);

pub enum ListenMsg {
    Audio(Bytes, Bytes),
}

pub struct ListenArgs {
    pub app: tauri::AppHandle,
    pub session_id: String,
    pub languages: Vec<hypr_language::Language>,
    pub onboarding: bool,
    pub session_start_ts_ms: u64,
}

pub struct ListenState {
    tx: tokio::sync::mpsc::Sender<MixedMessage<(Bytes, Bytes), ControlMessage>>,
    rx_task: tokio::task::JoinHandle<()>,
}

pub struct ListenBridge;

impl ListenBridge {
    pub fn name() -> ActorName {
        "listen_bridge".into()
    }
}

impl Actor for ListenBridge {
    type Msg = ListenMsg;
    type State = ListenState;
    type Arguments = ListenArgs;

    async fn pre_start(
        &self,
        myself: ActorRef<Self::Msg>,
        args: Self::Arguments,
    ) -> Result<Self::State, ActorProcessingErr> {
        let (tx, rx) =
            tokio::sync::mpsc::channel::<MixedMessage<(Bytes, Bytes), ControlMessage>>(32);

        let conn = {
            use tauri_plugin_local_stt::LocalSttPluginExt;

            match args.app.get_connection().await {
                Ok(c) => c,
                Err(e) => {
                    tracing::error!("failed_to_get_connection: {:?}", e);
                    return Err(ActorProcessingErr::from(e));
                }
            }
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

        let rx_task = tokio::spawn({
            let app = args.app.clone();
            let session_id = args.session_id.clone();

            async move {
                let outbound = tokio_stream::wrappers::ReceiverStream::new(rx);
                let (listen_stream, _handle) = match client.from_realtime_audio(outbound).await {
                    Ok(res) => res,
                    Err(e) => {
                        tracing::error!("listen_ws_connect_failed: {:?}", e);
                        myself.stop(Some(format!("listen_ws_connect_failed: {:?}", e)));
                        return;
                    }
                };
                futures_util::pin_mut!(listen_stream);

                let mut manager = TranscriptManager::with_unix_timestamp(args.session_start_ts_ms);

                loop {
                    match tokio::time::timeout(LISTEN_STREAM_TIMEOUT, listen_stream.next()).await {
                        Ok(Some(response)) => {
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
                        Ok(None) => {
                            tracing::info!("listen_stream_ended");
                            break;
                        }
                        Err(_) => {
                            tracing::info!("listen_stream_timeout");
                            break;
                        }
                    }
                }

                myself.stop(None);
            }
        });

        Ok(ListenState { tx, rx_task })
    }

    async fn handle(
        &self,
        _myself: ActorRef<Self::Msg>,
        message: Self::Msg,
        state: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        match message {
            ListenMsg::Audio(mic, spk) => {
                let _ = state.tx.try_send(MixedMessage::Audio((mic, spk)));
            }
        }
        Ok(())
    }

    async fn post_stop(
        &self,
        _myself: ActorRef<Self::Msg>,
        state: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        state.rx_task.abort();
        Ok(())
    }
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
