use std::collections::BTreeMap;
use std::time::{Instant, SystemTime};

use ractor::{Actor, ActorCell, ActorProcessingErr, ActorRef, RpcReplyPort, SupervisionEvent};
use tauri_plugin_settings::SettingsPluginExt;
use tauri_specta::Event;
use tracing::Instrument;

use crate::SessionLifecycleEvent;
use crate::actors::{SessionContext, SessionParams, spawn_session_supervisor};

/// Creates a tracing span with session context that child events will inherit
pub(crate) fn session_span(session_id: &str) -> tracing::Span {
    tracing::info_span!("session", session_id = %session_id)
}

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
                stop_session_impl(state).await;
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
                    let session_id = state.session_id.take().unwrap_or_default();
                    let span = session_span(&session_id);
                    let _guard = span.enter();
                    tracing::info!(?reason, "session_supervisor_terminated");
                    state.supervisor = None;
                    state.finalizing = false;
                    emit_session_ended(&state.app, &session_id, None);
                }
            }
            SupervisionEvent::ActorFailed(cell, error) => {
                if let Some(supervisor) = &state.supervisor
                    && cell.get_id() == supervisor.get_id()
                {
                    let session_id = state.session_id.take().unwrap_or_default();
                    let span = session_span(&session_id);
                    let _guard = span.enter();
                    tracing::warn!(?error, "session_supervisor_failed");
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
    let session_id = params.session_id.clone();
    let span = session_span(&session_id);

    async {
        if state.supervisor.is_some() {
            tracing::warn!("session_already_running");
            return false;
        }

        configure_sentry_session_context(&params);

        let app_dir = match state.app.settings().cached_vault_base() {
            Ok(base) => base.join("sessions"),
            Err(e) => {
                tracing::error!(error = ?e, "failed_to_resolve_sessions_base_dir");
                clear_sentry_session_context();
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
                clear_sentry_session_context();

                use tauri_plugin_tray::TrayPluginExt;
                let _ = state.app.tray().set_start_disabled(false);
                false
            }
        }
    }
    .instrument(span)
    .await
}

fn configure_sentry_session_context(params: &SessionParams) {
    sentry::configure_scope(|scope| {
        scope.set_tag("session_id", &params.session_id);
        scope.set_tag(
            "session_type",
            if params.onboarding {
                "onboarding"
            } else {
                "production"
            },
        );

        let mut session_context = BTreeMap::new();
        session_context.insert("session_id".to_string(), params.session_id.clone().into());
        session_context.insert("model".to_string(), params.model.clone().into());
        session_context.insert("record_enabled".to_string(), params.record_enabled.into());
        session_context.insert("onboarding".to_string(), params.onboarding.into());
        session_context.insert(
            "languages".to_string(),
            format!("{:?}", params.languages).into(),
        );
        scope.set_context("session", sentry::protocol::Context::Other(session_context));
    });
}

async fn stop_session_impl(state: &mut RootState) {
    if let Some(supervisor) = &state.supervisor {
        state.finalizing = true;

        if let Some(session_id) = &state.session_id {
            let span = session_span(session_id);
            let _guard = span.enter();
            tracing::info!("session_finalizing");

            if let Err(error) = (SessionLifecycleEvent::Finalizing {
                session_id: session_id.clone(),
            })
            .emit(&state.app)
            {
                tracing::error!(?error, "failed_to_emit_finalizing");
            }
        }

        // TO make sure post_stop is called.
        stop_actor_by_name_and_wait(crate::actors::RecorderActor::name(), "session_stop").await;

        supervisor.stop(None);
    }
}

async fn stop_actor_by_name_and_wait(actor_name: ractor::ActorName, reason: &str) {
    if let Some(cell) = ractor::registry::where_is(actor_name.clone()) {
        cell.stop(Some(reason.to_string()));
        wait_for_actor_shutdown(actor_name).await;
    }
}

async fn wait_for_actor_shutdown(actor_name: ractor::ActorName) {
    for _ in 0..50 {
        if ractor::registry::where_is(actor_name.clone()).is_none() {
            break;
        }
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;
    }
}

fn emit_session_ended(app: &tauri::AppHandle, session_id: &str, failure_reason: Option<String>) {
    let span = session_span(session_id);
    let _guard = span.enter();

    {
        use tauri_plugin_tray::TrayPluginExt;
        let _ = app.tray().set_start_disabled(false);
    }

    if let Err(error) = (SessionLifecycleEvent::Inactive {
        session_id: session_id.to_string(),
        error: failure_reason.clone(),
    })
    .emit(app)
    {
        tracing::error!(?error, "failed_to_emit_inactive");
    }

    if let Some(reason) = failure_reason {
        tracing::info!(failure_reason = %reason, "session_stopped");
    } else {
        tracing::info!("session_stopped");
    }

    clear_sentry_session_context();
}

fn clear_sentry_session_context() {
    sentry::configure_scope(|scope| {
        scope.remove_tag("session_id");
        scope.remove_tag("session_type");
        scope.remove_context("session");
    });
}
