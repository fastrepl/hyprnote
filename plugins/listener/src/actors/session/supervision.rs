use std::time::{Duration, Instant};

use ractor::{ActorRef, SupervisionEvent};

use super::lifecycle::{emit_degraded, emit_session_ended, spawn_recorder, spawn_source};
use super::{SessionActorState, SessionMsg, session_span};
use crate::DegradedError;

const MAX_RESTARTS: u32 = 3;
const RESTART_WINDOW: Duration = Duration::from_secs(15);

pub(crate) struct RestartState {
    count: u32,
    window_start: Instant,
}

impl RestartState {
    pub fn new() -> Self {
        Self {
            count: 0,
            window_start: Instant::now(),
        }
    }

    pub fn should_restart(&mut self) -> bool {
        let now = Instant::now();
        if now.duration_since(self.window_start) > RESTART_WINDOW {
            self.count = 0;
            self.window_start = now;
        }
        if self.count < MAX_RESTARTS {
            self.count += 1;
            true
        } else {
            false
        }
    }

    pub fn count(&self) -> u32 {
        self.count
    }
}

enum RestartableChild {
    Source,
    Recorder,
}

impl RestartableChild {
    fn name(&self) -> &'static str {
        match self {
            Self::Source => "source",
            Self::Recorder => "recorder",
        }
    }

    fn label(&self) -> &'static str {
        match self {
            Self::Source => "Source",
            Self::Recorder => "Recorder",
        }
    }
}

async fn try_restart_child(
    child: RestartableChild,
    myself: &ActorRef<SessionMsg>,
    state: &mut SessionActorState,
) {
    if state.finalizing {
        return;
    }

    let app = state.app.clone();
    let name = child.name();
    let label = child.label();

    let can_restart = {
        let Some(active) = state.active.as_mut() else {
            return;
        };
        match child {
            RestartableChild::Source => active.source_restart.should_restart(),
            RestartableChild::Recorder => active.recorder_restart.should_restart(),
        }
    };

    if !can_restart {
        tracing::error!("{name}_restart_limit_exceeded_meltdown");
        trigger_meltdown(state, &format!("{label} restart limit exceeded")).await;
        return;
    }

    let count = {
        let active = state.active.as_ref().unwrap();
        match child {
            RestartableChild::Source => active.source_restart.count(),
            RestartableChild::Recorder => active.recorder_restart.count(),
        }
    };
    tracing::info!(restart_count = count, "restarting_{name}");

    let spawn_result = {
        let active = state.active.as_mut().unwrap();
        match child {
            RestartableChild::Source => spawn_source(myself, active, &app).await,
            RestartableChild::Recorder => spawn_recorder(myself, active).await,
        }
    };

    if let Err(e) = spawn_result {
        tracing::error!(error = ?e, "{name}_restart_failed_meltdown");
        trigger_meltdown(state, &format!("{label} restart failed")).await;
    }
}

pub(super) async fn handle_supervisor_evt(
    myself: ActorRef<SessionMsg>,
    message: SupervisionEvent,
    state: &mut SessionActorState,
) {
    if state.active.is_none() {
        return;
    }

    let session_id = state.active.as_ref().unwrap().session_id.clone();
    let span = session_span(&session_id);
    let _guard = span.enter();

    match message {
        SupervisionEvent::ActorStarted(_) | SupervisionEvent::ProcessGroupChanged(_) => {}

        SupervisionEvent::ActorTerminated(cell, _, reason) => {
            let actor_id = cell.get_id();

            let is_listener = state
                .active
                .as_ref()
                .unwrap()
                .listener
                .as_ref()
                .is_some_and(|c| c.get_id() == actor_id);
            let is_source = state
                .active
                .as_ref()
                .unwrap()
                .source
                .as_ref()
                .is_some_and(|c| c.get_id() == actor_id);
            let is_recorder = state
                .active
                .as_ref()
                .unwrap()
                .recorder
                .as_ref()
                .is_some_and(|c| c.get_id() == actor_id);

            if is_listener {
                let active = state.active.as_mut().unwrap();
                active.listener = None;

                let degraded_error = reason
                    .as_ref()
                    .and_then(|r| serde_json::from_str::<DegradedError>(r).ok());

                if let Some(error) = degraded_error {
                    tracing::info!(?error, "listener_terminated_entering_degraded_mode");
                    active.listener_degraded = Some(error.clone());
                    emit_degraded(&state.app, &session_id, error);
                } else {
                    tracing::info!(?reason, "listener_terminated");
                }
            } else if is_source {
                state.active.as_mut().unwrap().source = None;
                tracing::info!(?reason, "source_terminated");
                try_restart_child(RestartableChild::Source, &myself, state).await;
            } else if is_recorder {
                state.active.as_mut().unwrap().recorder = None;
                tracing::info!(?reason, "recorder_terminated");
                try_restart_child(RestartableChild::Recorder, &myself, state).await;
            }
        }

        SupervisionEvent::ActorFailed(cell, error) => {
            let actor_id = cell.get_id();

            let is_listener = state
                .active
                .as_ref()
                .unwrap()
                .listener
                .as_ref()
                .is_some_and(|c| c.get_id() == actor_id);
            let is_source = state
                .active
                .as_ref()
                .unwrap()
                .source
                .as_ref()
                .is_some_and(|c| c.get_id() == actor_id);
            let is_recorder = state
                .active
                .as_ref()
                .unwrap()
                .recorder
                .as_ref()
                .is_some_and(|c| c.get_id() == actor_id);

            if is_listener {
                let active = state.active.as_mut().unwrap();
                active.listener = None;
                tracing::warn!(?error, "listener_failed_entering_degraded_mode");
                let err = DegradedError::UpstreamUnavailable {
                    message: format!("{}", error),
                };
                active.listener_degraded = Some(err.clone());
                emit_degraded(&state.app, &session_id, err);
            } else if is_source {
                state.active.as_mut().unwrap().source = None;
                tracing::warn!(?error, "source_failed");
                try_restart_child(RestartableChild::Source, &myself, state).await;
            } else if is_recorder {
                state.active.as_mut().unwrap().recorder = None;
                tracing::warn!(?error, "recorder_failed");
                try_restart_child(RestartableChild::Recorder, &myself, state).await;
            }
        }
    }
}

async fn trigger_meltdown(state: &mut SessionActorState, reason: &str) {
    let Some(active) = state.active.take() else {
        return;
    };

    let span = session_span(&active.session_id);
    let _guard = span.enter();

    state.finalizing = false;

    if let Some(source) = &active.source {
        source.stop(Some("meltdown".to_string()));
    }
    if let Some(recorder) = &active.recorder {
        recorder.stop(Some("meltdown".to_string()));
    }
    if let Some(listener) = &active.listener {
        listener.stop(Some("meltdown".to_string()));
    }

    emit_session_ended(&state.app, &active.session_id, Some(reason.to_string()));
}
