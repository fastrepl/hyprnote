mod adapters;
mod stream;

use std::time::{Instant, SystemTime};

use bytes::Bytes;
use ractor::{Actor, ActorName, ActorProcessingErr, ActorRef};
use tauri_specta::Event;
use tokio::time::error::Elapsed;
use tracing::Instrument;

use owhisper_interface::MixedMessage;
use owhisper_interface::stream::StreamResponse;

use super::session::session_span;
use crate::{DegradedError, SessionDataEvent, SessionProgressEvent};

use adapters::spawn_rx_task;
use stream::ChannelSender;

const AUDIO_SEND_FAILURE_THRESHOLD: u32 = 10;

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
    consecutive_send_failures: u32,
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
        let session_id = args.session_id.clone();
        let span = session_span(&session_id);

        async {
            if let Err(error) = (SessionProgressEvent::Connecting {
                session_id: session_id.clone(),
            })
            .emit(&args.app)
            {
                tracing::error!(?error, "failed_to_emit_connecting");
            }

            let (tx, rx_task, shutdown_tx, adapter_name) =
                spawn_rx_task(args.clone(), myself).await?;

            if let Err(error) = (SessionProgressEvent::Connected {
                session_id: session_id.clone(),
                adapter: adapter_name,
            })
            .emit(&args.app)
            {
                tracing::error!(?error, "failed_to_emit_connected");
            }

            let state = ListenerState {
                args,
                tx,
                rx_task,
                shutdown_tx: Some(shutdown_tx),
                consecutive_send_failures: 0,
            };

            Ok(state)
        }
        .instrument(span)
        .await
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
        let span = session_span(&state.args.session_id);
        let _guard = span.enter();

        match message {
            ListenerMsg::AudioSingle(audio) => {
                if let ChannelSender::Single(tx) = &state.tx {
                    match tx.try_send(MixedMessage::Audio(audio)) {
                        Ok(()) => {
                            state.consecutive_send_failures = 0;
                        }
                        Err(e) => {
                            state.consecutive_send_failures += 1;
                            if state.consecutive_send_failures >= AUDIO_SEND_FAILURE_THRESHOLD {
                                tracing::error!(
                                    consecutive_failures = state.consecutive_send_failures,
                                    error = ?e,
                                    "audio_send_failures_exceeded_threshold_entering_degraded_mode"
                                );
                                stop_with_degraded_error(myself, DegradedError::ChannelOverflow);
                                return Ok(());
                            }
                            tracing::warn!(
                                consecutive_failures = state.consecutive_send_failures,
                                "audio_send_failed"
                            );
                        }
                    }
                }
            }

            ListenerMsg::AudioDual(mic, spk) => {
                if let ChannelSender::Dual(tx) = &state.tx {
                    match tx.try_send(MixedMessage::Audio((mic, spk))) {
                        Ok(()) => {
                            state.consecutive_send_failures = 0;
                        }
                        Err(e) => {
                            state.consecutive_send_failures += 1;
                            if state.consecutive_send_failures >= AUDIO_SEND_FAILURE_THRESHOLD {
                                tracing::error!(
                                    consecutive_failures = state.consecutive_send_failures,
                                    error = ?e,
                                    "audio_send_failures_exceeded_threshold_entering_degraded_mode"
                                );
                                stop_with_degraded_error(myself, DegradedError::ChannelOverflow);
                                return Ok(());
                            }
                            tracing::warn!(
                                consecutive_failures = state.consecutive_send_failures,
                                "audio_send_failed"
                            );
                        }
                    }
                }
            }

            ListenerMsg::StreamResponse(mut response) => {
                if let StreamResponse::ErrorResponse {
                    error_code,
                    error_message,
                    provider,
                } = &response
                {
                    tracing::error!(
                        ?error_code,
                        %error_message,
                        %provider,
                        "stream_provider_error"
                    );
                    stop_with_degraded_error(
                        myself,
                        DegradedError::AuthenticationFailed {
                            provider: provider.clone(),
                        },
                    );
                    return Ok(());
                }

                match state.args.mode {
                    crate::actors::ChannelMode::MicOnly => {
                        response.remap_channel_index(0, 2);
                    }
                    crate::actors::ChannelMode::SpeakerOnly => {
                        response.remap_channel_index(1, 2);
                    }
                    crate::actors::ChannelMode::MicAndSpeaker => {}
                }

                if let Err(error) = (SessionDataEvent::StreamResponse {
                    session_id: state.args.session_id.clone(),
                    response: Box::new(response),
                })
                .emit(&state.args.app)
                {
                    tracing::error!(?error, "stream_response_emit_failed");
                }
            }

            ListenerMsg::StreamError(error) => {
                tracing::warn!("listen_stream_error: {}", error);
                stop_with_degraded_error(myself, DegradedError::StreamError { message: error });
            }

            ListenerMsg::StreamEnded => {
                tracing::warn!("listen_stream_ended_unexpectedly");
                stop_with_degraded_error(
                    myself,
                    DegradedError::UpstreamUnavailable {
                        message: "stream ended unexpectedly".to_string(),
                    },
                );
            }

            ListenerMsg::StreamTimeout(_elapsed) => {
                tracing::warn!("listen_stream_timeout");
                stop_with_degraded_error(myself, DegradedError::ConnectionTimeout);
            }
        }
        Ok(())
    }
}

fn stop_with_degraded_error(myself: ActorRef<ListenerMsg>, error: DegradedError) {
    let reason = serde_json::to_string(&error).ok();
    myself.stop(reason);
}
