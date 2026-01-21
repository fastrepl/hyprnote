mod lifecycle;
mod supervision;

use std::path::PathBuf;
use std::time::SystemTime;

use ractor::{Actor, ActorCell, ActorProcessingErr, ActorRef, RpcReplyPort, SupervisionEvent};

use crate::DegradedError;

use lifecycle::{start_session_impl, stop_session_impl};
use supervision::{RestartState, handle_supervisor_evt};

pub(crate) fn session_span(session_id: &str) -> tracing::Span {
    tracing::info_span!("session", session_id = %session_id)
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct SessionParams {
    pub session_id: String,
    pub languages: Vec<hypr_language::Language>,
    pub onboarding: bool,
    pub record_enabled: bool,
    pub model: String,
    pub base_url: String,
    pub api_key: String,
    pub keywords: Vec<String>,
}

pub enum SessionMsg {
    Start(SessionParams, RpcReplyPort<bool>),
    Stop(RpcReplyPort<()>),
    GetState(RpcReplyPort<crate::fsm::State>),
}

pub struct SessionArgs {
    pub app: tauri::AppHandle,
}

pub(super) struct ActiveSession {
    pub(super) session_id: String,
    pub(super) app_dir: PathBuf,
    pub(super) params: SessionParams,
    pub(super) started_at_instant: std::time::Instant,
    pub(super) started_at_system: SystemTime,

    pub(super) source: Option<ActorCell>,
    pub(super) recorder: Option<ActorCell>,
    pub(super) listener: Option<ActorCell>,

    pub(super) listener_degraded: Option<DegradedError>,

    pub(super) source_restart: RestartState,
    pub(super) recorder_restart: RestartState,
}

pub struct SessionActorState {
    pub(super) app: tauri::AppHandle,
    pub(super) active: Option<ActiveSession>,
    pub(super) finalizing: bool,
}

pub struct SessionActor;

impl SessionActor {
    pub fn name() -> ractor::ActorName {
        "session_actor".into()
    }
}

#[ractor::async_trait]
impl Actor for SessionActor {
    type Msg = SessionMsg;
    type State = SessionActorState;
    type Arguments = SessionArgs;

    async fn pre_start(
        &self,
        _myself: ActorRef<Self::Msg>,
        args: Self::Arguments,
    ) -> Result<Self::State, ActorProcessingErr> {
        Ok(SessionActorState {
            app: args.app,
            active: None,
            finalizing: false,
        })
    }

    async fn handle(
        &self,
        myself: ActorRef<Self::Msg>,
        message: Self::Msg,
        state: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        match message {
            SessionMsg::Start(params, reply) => {
                let success = start_session_impl(myself.clone(), params, state).await;
                let _ = reply.send(success);
            }
            SessionMsg::Stop(reply) => {
                stop_session_impl(state).await;
                let _ = reply.send(());
            }
            SessionMsg::GetState(reply) => {
                let fsm_state = if state.finalizing {
                    crate::fsm::State::Finalizing
                } else if state.active.is_some() {
                    crate::fsm::State::Active
                } else {
                    crate::fsm::State::Inactive
                };
                let _ = reply.send(fsm_state);
            }
        }
        Ok(())
    }

    async fn handle_supervisor_evt(
        &self,
        myself: ActorRef<Self::Msg>,
        message: SupervisionEvent,
        state: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        handle_supervisor_evt(myself, message, state).await;
        Ok(())
    }
}
