use std::collections::BTreeMap;
use std::time::{Duration, Instant, SystemTime};

use ractor::{Actor, ActorProcessingErr, ActorRef};
use tauri_plugin_settings::SettingsPluginExt;
use tauri_specta::Event;
use tracing::Instrument;

use super::supervision::RestartState;
use super::{ActiveSession, SessionActorState, SessionMsg, SessionParams};
use crate::actors::{
    ChannelMode, ListenerActor, ListenerArgs, RecArgs, RecorderActor, SourceActor, SourceArgs,
};
use crate::{CriticalError, DegradedError, SessionLifecycleEvent};

use super::session_span;

pub(super) async fn start_session_impl(
    myself: ActorRef<SessionMsg>,
    params: SessionParams,
    state: &mut SessionActorState,
) -> bool {
    let session_id = params.session_id.clone();
    let span = session_span(&session_id);

    async {
        if state.active.is_some() {
            tracing::warn!("session_already_running");
            return false;
        }

        configure_sentry_session_context(&params);

        let app_dir = match state.app.settings().settings_base() {
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

        let mut active = ActiveSession {
            session_id: params.session_id.clone(),
            app_dir,
            params: params.clone(),
            started_at_instant: Instant::now(),
            started_at_system: SystemTime::now(),
            source: None,
            recorder: None,
            listener: None,
            listener_degraded: None,
            source_restart: RestartState::new(),
            recorder_restart: RestartState::new(),
        };

        if let Err(e) = spawn_source(&myself, &mut active, &state.app).await {
            tracing::error!(error = ?e, "failed_to_spawn_source");
            cleanup_failed_start(state, &params).await;
            return false;
        }

        if let Err(e) = spawn_recorder(&myself, &mut active).await {
            tracing::error!(error = ?e, "failed_to_spawn_recorder");
            if let Some(source) = &active.source {
                source.stop(Some("startup_failure".to_string()));
            }
            cleanup_failed_start(state, &params).await;
            return false;
        }

        if let Err(e) = spawn_listener(&myself, &mut active, &state.app).await {
            tracing::warn!(error = ?e, "failed_to_spawn_listener_continuing_degraded");
            active.listener_degraded = Some(DegradedError::UpstreamUnavailable {
                message: format!("{:?}", e),
            });
        }

        state.active = Some(active);

        let degraded_error = state
            .active
            .as_ref()
            .and_then(|s| s.listener_degraded.clone());

        if let Err(error) = (SessionLifecycleEvent::Active {
            session_id: params.session_id,
            error: degraded_error,
        })
        .emit(&state.app)
        {
            tracing::error!(?error, "failed_to_emit_active");
        }

        tracing::info!("session_started");
        true
    }
    .instrument(span)
    .await
}

pub(super) async fn stop_session_impl(state: &mut SessionActorState) {
    let Some(active) = &state.active else {
        return;
    };

    state.finalizing = true;

    let span = session_span(&active.session_id);
    let _guard = span.enter();
    tracing::info!("session_finalizing");

    if let Err(error) = (SessionLifecycleEvent::Finalizing {
        session_id: active.session_id.clone(),
    })
    .emit(&state.app)
    {
        tracing::error!(?error, "failed_to_emit_finalizing");
    }

    stop_actor_by_name_and_wait(RecorderActor::name(), "session_stop").await;

    if let Some(source) = &active.source {
        source.stop(Some("session_stop".to_string()));
    }
    if let Some(listener) = &active.listener {
        listener.stop(Some("session_stop".to_string()));
    }

    wait_for_all_actors_shutdown(active).await;

    let session_id = active.session_id.clone();
    state.active = None;
    state.finalizing = false;

    emit_session_ended(&state.app, &session_id, None);
}

async fn cleanup_failed_start(state: &mut SessionActorState, params: &SessionParams) {
    clear_sentry_session_context();

    use tauri_plugin_tray::TrayPluginExt;
    let _ = state.app.tray().set_start_disabled(false);

    let _ = (SessionLifecycleEvent::Inactive {
        session_id: params.session_id.clone(),
        error: Some(CriticalError {
            message: "Failed to start session".to_string(),
        }),
    })
    .emit(&state.app);
}

pub(super) async fn spawn_source(
    myself: &ActorRef<SessionMsg>,
    active: &mut ActiveSession,
    app: &tauri::AppHandle,
) -> Result<(), ActorProcessingErr> {
    let (actor_ref, _) = Actor::spawn_linked(
        Some(SourceActor::name()),
        SourceActor,
        SourceArgs {
            mic_device: None,
            onboarding: active.params.onboarding,
            app: app.clone(),
            session_id: active.session_id.clone(),
        },
        myself.get_cell(),
    )
    .await?;
    active.source = Some(actor_ref.get_cell());
    Ok(())
}

pub(super) async fn spawn_recorder(
    myself: &ActorRef<SessionMsg>,
    active: &mut ActiveSession,
) -> Result<(), ActorProcessingErr> {
    let (actor_ref, _) = Actor::spawn_linked(
        Some(RecorderActor::name()),
        RecorderActor,
        RecArgs {
            app_dir: active.app_dir.clone(),
            session_id: active.session_id.clone(),
        },
        myself.get_cell(),
    )
    .await?;
    active.recorder = Some(actor_ref.get_cell());
    Ok(())
}

pub(super) async fn spawn_listener(
    myself: &ActorRef<SessionMsg>,
    active: &mut ActiveSession,
    app: &tauri::AppHandle,
) -> Result<(), ActorProcessingErr> {
    let mode = ChannelMode::determine(active.params.onboarding);

    let (actor_ref, _) = Actor::spawn_linked(
        Some(ListenerActor::name()),
        ListenerActor,
        ListenerArgs {
            app: app.clone(),
            languages: active.params.languages.clone(),
            onboarding: active.params.onboarding,
            model: active.params.model.clone(),
            base_url: active.params.base_url.clone(),
            api_key: active.params.api_key.clone(),
            keywords: active.params.keywords.clone(),
            mode,
            session_started_at: active.started_at_instant,
            session_started_at_unix: active.started_at_system,
            session_id: active.session_id.clone(),
        },
        myself.get_cell(),
    )
    .await?;
    active.listener = Some(actor_ref.get_cell());
    Ok(())
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

pub(super) fn clear_sentry_session_context() {
    sentry::configure_scope(|scope| {
        scope.remove_tag("session_id");
        scope.remove_tag("session_type");
        scope.remove_context("session");
    });
}

async fn wait_for_all_actors_shutdown(active: &ActiveSession) {
    wait_for_actor_shutdown(SourceActor::name()).await;
    wait_for_actor_shutdown(RecorderActor::name()).await;
    wait_for_actor_shutdown(ListenerActor::name()).await;

    let _ = active;
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
        tokio::time::sleep(Duration::from_millis(100)).await;
    }
}

pub(super) fn emit_degraded(app: &tauri::AppHandle, session_id: &str, error: DegradedError) {
    if let Err(e) = (SessionLifecycleEvent::Active {
        session_id: session_id.to_string(),
        error: Some(error),
    })
    .emit(app)
    {
        tracing::error!(?e, "failed_to_emit_degraded");
    }
}

pub(super) fn emit_session_ended(
    app: &tauri::AppHandle,
    session_id: &str,
    failure_reason: Option<String>,
) {
    let span = session_span(session_id);
    let _guard = span.enter();

    {
        use tauri_plugin_tray::TrayPluginExt;
        let _ = app.tray().set_start_disabled(false);
    }

    let error = failure_reason.as_ref().map(|msg| CriticalError {
        message: msg.clone(),
    });

    if let Err(e) = (SessionLifecycleEvent::Inactive {
        session_id: session_id.to_string(),
        error,
    })
    .emit(app)
    {
        tracing::error!(?e, "failed_to_emit_inactive");
    }

    if let Some(reason) = failure_reason {
        tracing::info!(failure_reason = %reason, "session_stopped");
    } else {
        tracing::info!("session_stopped");
    }

    clear_sentry_session_context();
}
