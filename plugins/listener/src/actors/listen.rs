use bytes::Bytes;
use futures_util::StreamExt;
use owhisper_interface::{ControlMessage, MixedMessage};
use ractor::{Actor, ActorProcessingErr, ActorRef};
use std::time::Duration;
use tauri_specta::Event;

use crate::{manager::TranscriptManager, SessionEvent};

const LISTEN_STREAM_TIMEOUT: Duration = Duration::from_secs(60 * 15);

pub enum ListenMsg {
    Audio(Vec<u8>, Vec<u8>),
}

pub struct ListenArgs {
    pub app: tauri::AppHandle,
    pub languages: Vec<hypr_language::Language>,
    pub onboarding: bool,
    pub session_start_ts_ms: u64,
}

pub struct ListenState {
    app: tauri::AppHandle,
    tx: tokio::sync::mpsc::Sender<MixedMessage<(Bytes, Bytes), ControlMessage>>,
    rx_task: tokio::task::JoinHandle<()>,
}

pub struct ListenBridge;
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
        let app_for_state = args.app.clone();
        let rx_task = tokio::spawn(async move {
            use tauri_plugin_local_stt::LocalSttPluginExt;
            // get connection
            let conn = match args.app.get_connection().await {
                Ok(c) => c,
                Err(e) => {
                    tracing::error!("listen_get_connection_failed: {:?}", e);
                    myself.stop(None);
                    return;
                }
            };

            // build client
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

            // stream out
            let outbound = tokio_stream::wrappers::ReceiverStream::new(rx);
            let (listen_stream, _handle) = match client.from_realtime_audio(outbound).await {
                Ok(res) => res,
                Err(e) => {
                    tracing::error!("listen_ws_connect_failed: {:?}", e);
                    myself.stop(None);
                    return;
                }
            };

            futures_util::pin_mut!(listen_stream);
            let mut manager = TranscriptManager::with_unix_timestamp(args.session_start_ts_ms);
            loop {
                match tokio::time::timeout(LISTEN_STREAM_TIMEOUT, listen_stream.next()).await {
                    Ok(Some(resp)) => {
                        let _diff = manager.append(resp.clone());
                        // emit events + db update (elided for brevity)
                        let _ = SessionEvent::FinalWords {
                            words: Default::default(),
                        }
                        .emit(&args.app);
                    }
                    Ok(None) => break,
                    Err(_) => break,
                }
            }
            myself.stop(None);
        });

        Ok(ListenState {
            app: app_for_state,
            tx,
            rx_task,
        })
    }

    async fn handle(
        &self,
        myself: ActorRef<Self::Msg>,
        message: Self::Msg,
        state: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        match message {
            ListenMsg::Audio(mic, spk) => {
                let _ = state
                    .tx
                    .try_send(MixedMessage::Audio((Bytes::from(mic), Bytes::from(spk))));
            }
        }
        Ok(())
    }
}
