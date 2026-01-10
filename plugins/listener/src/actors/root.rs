use std::time::{Instant, SystemTime};

use ractor::{Actor, ActorCell, ActorProcessingErr, ActorRef, RpcReplyPort, SupervisionEvent};
use tauri::Manager;
use tauri::path::BaseDirectory;
use tauri_specta::Event;

use crate::SessionLifecycleEvent;
use crate::actors::{SessionContext, SessionParams, spawn_session_supervisor};

pub enum RootMsg {
    StartSession(SessionParams, RpcReplyPort<bool>),
    StopSession(RpcReplyPort<()>),
    GetState(RpcReplyPort<crate::fsm::State>),
}

pub struct RootArgs {
    pub app: tauri::AppHandle,
}

pub struct RootState {
    app: tauri::AppHandle,
    session_id: Option<String>,
    supervisor: Option<ActorCell>,
    finalizing: bool,
}

pub struct RootActor;

impl RootActor {
    pub fn name() -> ractor::ActorName {
        "listener_root_actor".into()
    }
}

#[ractor::async_trait]
impl Actor for RootActor {
    type Msg = RootMsg;
    type State = RootState;
    type Arguments = RootArgs;

    async fn pre_start(
        &self,
        _myself: ActorRef<Self::Msg>,
        args: Self::Arguments,
    ) -> Result<Self::State, ActorProcessingErr> {
        Ok(RootState {
            app: args.app,
            session_id: None,
            supervisor: None,
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
            RootMsg::StartSession(params, reply) => {
                let success = start_session_impl(myself.get_cell(), params, state).await;
                let _ = reply.send(success);
            }
            RootMsg::StopSession(reply) => {
                stop_session_impl(state);
                let _ = reply.send(());
            }
            RootMsg::GetState(reply) => {
                let fsm_state = if state.finalizing {
                    crate::fsm::State::Finalizing
                } else if state.supervisor.is_some() {
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
        _myself: ActorRef<Self::Msg>,
        message: SupervisionEvent,
        state: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        match message {
            SupervisionEvent::ActorStarted(_) | SupervisionEvent::ProcessGroupChanged(_) => {}
            SupervisionEvent::ActorTerminated(cell, _, reason) => {
                if let Some(supervisor) = &state.supervisor
                    && cell.get_id() == supervisor.get_id()
                {
                    tracing::info!(?reason, "session_supervisor_terminated");
                    let session_id = state.session_id.take().unwrap_or_default();
                    state.supervisor = None;
                    state.finalizing = false;
                    emit_session_ended(&state.app, &session_id, None);
                }
            }
            SupervisionEvent::ActorFailed(cell, error) => {
                if let Some(supervisor) = &state.supervisor
                    && cell.get_id() == supervisor.get_id()
                {
                    tracing::warn!(?error, "session_supervisor_failed");
                    let session_id = state.session_id.take().unwrap_or_default();
                    state.supervisor = None;
                    state.finalizing = false;
                    emit_session_ended(&state.app, &session_id, Some(format!("{:?}", error)));
                }
            }
        }
        Ok(())
    }
}

async fn start_session_impl(
    root_cell: ActorCell,
    params: SessionParams,
    state: &mut RootState,
) -> bool {
    if state.supervisor.is_some() {
        tracing::warn!("session_already_running");
        return false;
    }

    let app_dir = match state
        .app
        .path()
        .resolve("hyprnote/sessions", BaseDirectory::Data)
    {
        Ok(dir) => dir,
        Err(e) => {
            tracing::error!(error = ?e, "failed_to_resolve_app_dir");
            return false;
        }
    };

    {
        use tauri_plugin_tray::TrayPluginExt;
        let _ = state.app.tray().set_start_disabled(true);
    }

    let ctx = SessionContext {
        app: state.app.clone(),
        params: params.clone(),
        app_dir,
        started_at_instant: Instant::now(),
        started_at_system: SystemTime::now(),
    };

    match spawn_session_supervisor(ctx).await {
        Ok((supervisor_cell, _handle)) => {
            supervisor_cell.link(root_cell);

            state.session_id = Some(params.session_id.clone());
            state.supervisor = Some(supervisor_cell);

            if let Err(error) = (SessionLifecycleEvent::Active {
                session_id: params.session_id,
            })
            .emit(&state.app)
            {
                tracing::error!(?error, "failed_to_emit_active");
            }

            tracing::info!("session_started");
            true
        }
        Err(e) => {
            tracing::error!(error = ?e, "failed_to_start_session");

            use tauri_plugin_tray::TrayPluginExt;
            let _ = state.app.tray().set_start_disabled(false);
            false
        }
    }
}

fn stop_session_impl(state: &mut RootState) {
    if let Some(supervisor) = &state.supervisor {
        state.finalizing = true;

        if let Some(session_id) = &state.session_id
            && let Err(error) = (SessionLifecycleEvent::Finalizing {
                session_id: session_id.clone(),
            })
            .emit(&state.app)
        {
            tracing::error!(?error, "failed_to_emit_finalizing");
        }

        supervisor.stop(None);
    }
}

fn emit_session_ended(app: &tauri::AppHandle, session_id: &str, failure_reason: Option<String>) {
    {
        use tauri_plugin_tray::TrayPluginExt;
        let _ = app.tray().set_start_disabled(false);
    }

    if let Err(error) = (SessionLifecycleEvent::Inactive {
        session_id: session_id.to_string(),
        error: failure_reason,
    })
    .emit(app)
    {
        tracing::error!(?error, "failed_to_emit_inactive");
    }

    tracing::info!("session_stopped");
}
