pub(crate) mod lifecycle;

use std::path::PathBuf;
use std::time::{Instant, SystemTime};

use ractor::concurrency::Duration;
use ractor::{Actor, ActorCell, ActorProcessingErr, ActorRef, SupervisionEvent};
use tauri_specta::Event;
use tracing::Instrument;

use crate::DegradedError;
use crate::SessionLifecycleEvent;
use crate::actors::{
    ChannelMode, ListenerActor, ListenerArgs, RecArgs, RecorderActor, SourceActor, SourceArgs,
};

pub const SESSION_SUPERVISOR_PREFIX: &str = "session_supervisor_";

/// Creates a tracing span with session context that child events will inherit
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

#[derive(Clone)]
pub struct SessionContext {
    pub app: tauri::AppHandle,
    pub params: SessionParams,
    pub app_dir: PathBuf,
    pub started_at_instant: Instant,
    pub started_at_system: SystemTime,
}

pub fn session_supervisor_name(session_id: &str) -> String {
    format!("{}{}", SESSION_SUPERVISOR_PREFIX, session_id)
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ChildKind {
    Source,
    Listener,
    Recorder,
}

struct RestartTracker {
    count: u32,
    window_start: Instant,
}

impl RestartTracker {
    fn new() -> Self {
        Self {
            count: 0,
            window_start: Instant::now(),
        }
    }

    fn record_restart(&mut self, max_restarts: u32, max_window: Duration) -> bool {
        let now = Instant::now();
        if now.duration_since(self.window_start) > max_window {
            self.count = 0;
            self.window_start = now;
        }
        self.count += 1;
        self.count <= max_restarts
    }

    fn maybe_reset(&mut self, reset_after: Duration) {
        let now = Instant::now();
        if now.duration_since(self.window_start) > reset_after {
            self.count = 0;
            self.window_start = now;
        }
    }
}

pub struct SessionState {
    ctx: SessionContext,
    source_cell: Option<ActorCell>,
    listener_cell: Option<ActorCell>,
    recorder_cell: Option<ActorCell>,
    listener_degraded: Option<DegradedError>,
    source_restarts: RestartTracker,
    recorder_restarts: RestartTracker,
    shutting_down: bool,
}

pub struct SessionActor;

impl SessionActor {
    const MAX_RESTARTS: u32 = 3;
    const MAX_WINDOW: Duration = Duration::from_secs(15);
    const RESET_AFTER: Duration = Duration::from_secs(30);
}

#[derive(Debug)]
pub enum SessionMsg {
    Shutdown,
}

#[ractor::async_trait]
impl Actor for SessionActor {
    type Msg = SessionMsg;
    type State = SessionState;
    type Arguments = SessionContext;

    async fn pre_start(
        &self,
        myself: ActorRef<Self::Msg>,
        ctx: Self::Arguments,
    ) -> Result<Self::State, ActorProcessingErr> {
        let session_id = ctx.params.session_id.clone();
        let span = session_span(&session_id);

        async {
            let (source_ref, _) = Actor::spawn_linked(
                Some(SourceActor::name()),
                SourceActor,
                SourceArgs {
                    mic_device: None,
                    onboarding: ctx.params.onboarding,
                    app: ctx.app.clone(),
                    session_id: ctx.params.session_id.clone(),
                },
                myself.get_cell(),
            )
            .await?;

            let mode = ChannelMode::determine(ctx.params.onboarding);
            let (listener_ref, _) = Actor::spawn_linked(
                Some(ListenerActor::name()),
                ListenerActor,
                ListenerArgs {
                    app: ctx.app.clone(),
                    languages: ctx.params.languages.clone(),
                    onboarding: ctx.params.onboarding,
                    model: ctx.params.model.clone(),
                    base_url: ctx.params.base_url.clone(),
                    api_key: ctx.params.api_key.clone(),
                    keywords: ctx.params.keywords.clone(),
                    mode,
                    session_started_at: ctx.started_at_instant,
                    session_started_at_unix: ctx.started_at_system,
                    session_id: ctx.params.session_id.clone(),
                },
                myself.get_cell(),
            )
            .await?;

            let recorder_cell = if ctx.params.record_enabled {
                let (recorder_ref, _) = Actor::spawn_linked(
                    Some(RecorderActor::name()),
                    RecorderActor,
                    RecArgs {
                        app_dir: ctx.app_dir.clone(),
                        session_id: ctx.params.session_id.clone(),
                    },
                    myself.get_cell(),
                )
                .await?;
                Some(recorder_ref.get_cell())
            } else {
                None
            };

            Ok(SessionState {
                ctx,
                source_cell: Some(source_ref.get_cell()),
                listener_cell: Some(listener_ref.get_cell()),
                recorder_cell,
                listener_degraded: None,
                source_restarts: RestartTracker::new(),
                recorder_restarts: RestartTracker::new(),
                shutting_down: false,
            })
        }
        .instrument(span)
        .await
    }

    async fn handle(
        &self,
        myself: ActorRef<Self::Msg>,
        message: Self::Msg,
        state: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        match message {
            SessionMsg::Shutdown => {
                state.shutting_down = true;

                if let Some(cell) = state.recorder_cell.take() {
                    cell.stop(Some("session_stop".to_string()));
                    lifecycle::wait_for_actor_shutdown(RecorderActor::name()).await;
                }

                if let Some(cell) = state.source_cell.take() {
                    cell.stop(Some("session_stop".to_string()));
                }
                if let Some(cell) = state.listener_cell.take() {
                    cell.stop(Some("session_stop".to_string()));
                }

                myself.stop(None);
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
        let span = session_span(&state.ctx.params.session_id);
        let _guard = span.enter();

        state.source_restarts.maybe_reset(Self::RESET_AFTER);
        state.recorder_restarts.maybe_reset(Self::RESET_AFTER);

        if state.shutting_down {
            return Ok(());
        }

        match message {
            SupervisionEvent::ActorStarted(_) | SupervisionEvent::ProcessGroupChanged(_) => {}

            SupervisionEvent::ActorTerminated(cell, _, reason) => {
                match identify_child(state, &cell) {
                    Some(ChildKind::Listener) => {
                        tracing::info!(?reason, "listener_terminated_entering_degraded_mode");
                        let degraded = reason
                            .as_ref()
                            .and_then(|r| serde_json::from_str::<DegradedError>(r).ok());
                        state.listener_degraded = degraded.clone();
                        state.listener_cell = None;

                        let _ = (SessionLifecycleEvent::Active {
                            session_id: state.ctx.params.session_id.clone(),
                            error: degraded,
                        })
                        .emit(&state.ctx.app);
                    }
                    Some(ChildKind::Source) => {
                        tracing::info!(?reason, "source_terminated_attempting_restart");
                        state.source_cell = None;
                        if !try_restart_source(myself.get_cell(), state).await {
                            tracing::error!("source_restart_limit_exceeded_meltdown");
                            meltdown(myself, state).await;
                        }
                    }
                    Some(ChildKind::Recorder) => {
                        tracing::info!(?reason, "recorder_terminated_attempting_restart");
                        state.recorder_cell = None;
                        if !try_restart_recorder(myself.get_cell(), state).await {
                            tracing::error!("recorder_restart_limit_exceeded_meltdown");
                            meltdown(myself, state).await;
                        }
                    }
                    None => {
                        tracing::warn!("unknown_child_terminated");
                    }
                }
            }

            SupervisionEvent::ActorFailed(cell, error) => match identify_child(state, &cell) {
                Some(ChildKind::Listener) => {
                    tracing::info!(?error, "listener_failed_entering_degraded_mode");
                    let degraded = DegradedError::StreamError {
                        message: format!("{:?}", error),
                    };
                    state.listener_degraded = Some(degraded.clone());
                    state.listener_cell = None;

                    let _ = (SessionLifecycleEvent::Active {
                        session_id: state.ctx.params.session_id.clone(),
                        error: Some(degraded),
                    })
                    .emit(&state.ctx.app);
                }
                Some(ChildKind::Source) => {
                    tracing::warn!(?error, "source_failed_attempting_restart");
                    state.source_cell = None;
                    if !try_restart_source(myself.get_cell(), state).await {
                        tracing::error!("source_restart_limit_exceeded_meltdown");
                        meltdown(myself, state).await;
                    }
                }
                Some(ChildKind::Recorder) => {
                    tracing::warn!(?error, "recorder_failed_attempting_restart");
                    state.recorder_cell = None;
                    if !try_restart_recorder(myself.get_cell(), state).await {
                        tracing::error!("recorder_restart_limit_exceeded_meltdown");
                        meltdown(myself, state).await;
                    }
                }
                None => {
                    tracing::warn!("unknown_child_failed");
                }
            },
        }
        Ok(())
    }
}

fn identify_child(state: &SessionState, cell: &ActorCell) -> Option<ChildKind> {
    if state
        .source_cell
        .as_ref()
        .is_some_and(|c| c.get_id() == cell.get_id())
    {
        return Some(ChildKind::Source);
    }
    if state
        .listener_cell
        .as_ref()
        .is_some_and(|c| c.get_id() == cell.get_id())
    {
        return Some(ChildKind::Listener);
    }
    if state
        .recorder_cell
        .as_ref()
        .is_some_and(|c| c.get_id() == cell.get_id())
    {
        return Some(ChildKind::Recorder);
    }
    None
}

async fn try_restart_source(supervisor_cell: ActorCell, state: &mut SessionState) -> bool {
    if !state
        .source_restarts
        .record_restart(SessionActor::MAX_RESTARTS, SessionActor::MAX_WINDOW)
    {
        return false;
    }

    for attempt in 0..3u32 {
        let delay = std::time::Duration::from_millis(100 * 2u64.pow(attempt));
        tokio::time::sleep(delay).await;

        match Actor::spawn_linked(
            Some(SourceActor::name()),
            SourceActor,
            SourceArgs {
                mic_device: None,
                onboarding: state.ctx.params.onboarding,
                app: state.ctx.app.clone(),
                session_id: state.ctx.params.session_id.clone(),
            },
            supervisor_cell.clone(),
        )
        .await
        {
            Ok((actor_ref, _)) => {
                state.source_cell = Some(actor_ref.get_cell());
                tracing::info!(attempt, "source_restarted");
                return true;
            }
            Err(e) => {
                tracing::warn!(attempt, error = ?e, "source_spawn_attempt_failed");
            }
        }
    }

    tracing::error!("source_restart_failed_all_attempts");
    false
}

async fn try_restart_recorder(supervisor_cell: ActorCell, state: &mut SessionState) -> bool {
    if !state.ctx.params.record_enabled {
        return true;
    }

    if !state
        .recorder_restarts
        .record_restart(SessionActor::MAX_RESTARTS, SessionActor::MAX_WINDOW)
    {
        return false;
    }

    for attempt in 0..3u32 {
        let delay = std::time::Duration::from_millis(100 * 2u64.pow(attempt));
        tokio::time::sleep(delay).await;

        match Actor::spawn_linked(
            Some(RecorderActor::name()),
            RecorderActor,
            RecArgs {
                app_dir: state.ctx.app_dir.clone(),
                session_id: state.ctx.params.session_id.clone(),
            },
            supervisor_cell.clone(),
        )
        .await
        {
            Ok((actor_ref, _)) => {
                state.recorder_cell = Some(actor_ref.get_cell());
                tracing::info!(attempt, "recorder_restarted");
                return true;
            }
            Err(e) => {
                tracing::warn!(attempt, error = ?e, "recorder_spawn_attempt_failed");
            }
        }
    }

    tracing::error!("recorder_restart_failed_all_attempts");
    false
}

async fn meltdown(myself: ActorRef<SessionMsg>, state: &mut SessionState) {
    if let Some(cell) = state.source_cell.take() {
        cell.stop(Some("meltdown".to_string()));
    }
    if let Some(cell) = state.listener_cell.take() {
        cell.stop(Some("meltdown".to_string()));
    }
    if let Some(cell) = state.recorder_cell.take() {
        cell.stop(Some("meltdown".to_string()));
        lifecycle::wait_for_actor_shutdown(RecorderActor::name()).await;
    }
    myself.stop(Some("restart_limit_exceeded".to_string()));
}

pub async fn spawn_session_supervisor(
    ctx: SessionContext,
) -> Result<(ActorCell, tokio::task::JoinHandle<()>), ActorProcessingErr> {
    let supervisor_name = session_supervisor_name(&ctx.params.session_id);

    let (actor_ref, handle) = Actor::spawn(Some(supervisor_name), SessionActor, ctx).await?;

    Ok((actor_ref.get_cell(), handle))
}
