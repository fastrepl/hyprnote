use std::sync::Arc;
use std::time::{Instant, SystemTime};

use ractor::{Actor, ActorRef};
use ractor_supervisor::{
    supervisor::{
        Supervisor, SupervisorArguments, SupervisorMsg, SupervisorOptions, SupervisorStrategy,
    },
    ChildSpec, Restart, SpawnFn,
};
use tokio::time::Duration;

use super::{
    ListenerActor, ListenerArgs, LiveContextHandle, RecArgs, RecorderActor, SessionShared,
    SourceActor, SourceArgs,
};

pub struct LiveSupervisorArgs {
    pub app: tauri::AppHandle,
    pub ctx: LiveContextHandle,
    pub languages: Vec<hypr_language::Language>,
    pub onboarding: bool,
    pub model: String,
    pub base_url: String,
    pub api_key: String,
    pub keywords: Vec<String>,
    pub session_started_at: Instant,
    pub session_started_at_unix: SystemTime,
    pub session_id: String,
    pub record_enabled: bool,
}

pub fn live_supervisor_spec(shared: Arc<SessionShared>) -> ChildSpec {
    let supervisor_options = SupervisorOptions {
        strategy: SupervisorStrategy::RestForOne,
        max_restarts: 5,
        max_window: Duration::from_secs(10),
        reset_after: Some(Duration::from_secs(30)),
    };

    ChildSpec {
        id: "live".to_string(),
        restart: Restart::Transient,
        spawn_fn: SpawnFn::new(move |supervisor_cell, child_id| {
            let shared = shared.clone();
            let options = supervisor_options.clone();

            async move {
                let args = shared.live_supervisor_args();
                let child_specs = build_child_specs(&args);

                let (live_ref, _) = Supervisor::spawn_linked(
                    child_id.into(),
                    Supervisor,
                    SupervisorArguments {
                        child_specs,
                        options,
                    },
                    supervisor_cell,
                )
                .await?;

                Ok(live_ref.get_cell())
            }
        }),
        backoff_fn: None,
        reset_after: Some(Duration::from_secs(30)),
    }
}

fn build_child_specs(args: &LiveSupervisorArgs) -> Vec<ChildSpec> {
    let mut child_specs = Vec::with_capacity(3);
    child_specs.push(build_source_spec(args));
    if let Some(recorder_spec) = build_recorder_spec(args) {
        child_specs.push(recorder_spec);
    }
    child_specs.push(build_listener_spec(args));
    child_specs
}

fn build_source_spec(args: &LiveSupervisorArgs) -> ChildSpec {
    let ctx = args.ctx.clone();
    let app = args.app.clone();
    let onboarding = args.onboarding;

    ChildSpec {
        id: SourceActor::name().to_string(),
        restart: Restart::Transient,
        spawn_fn: SpawnFn::new(move |supervisor_cell, child_id| {
            let ctx = ctx.clone();
            let app = app.clone();

            async move {
                let snapshot = ctx.read().await;
                let supervisor_ref: ActorRef<SupervisorMsg> = supervisor_cell.clone().into();
                let source_args = SourceArgs {
                    mic_device: snapshot.device_id.clone(),
                    onboarding,
                    app: app.clone(),
                    ctx: ctx.clone(),
                    supervisor: supervisor_ref,
                };

                let (source_ref, _) = Actor::spawn_linked(
                    Some(child_id.into()),
                    SourceActor,
                    source_args,
                    supervisor_cell,
                )
                .await?;

                Ok(source_ref.get_cell())
            }
        }),
        backoff_fn: None,
        reset_after: Some(Duration::from_secs(60)),
    }
}

fn build_recorder_spec(args: &LiveSupervisorArgs) -> Option<ChildSpec> {
    if !args.record_enabled {
        return None;
    }

    let app = args.app.clone();
    let session_id = args.session_id.clone();

    Some(ChildSpec {
        id: RecorderActor::name().to_string(),
        restart: Restart::Transient,
        spawn_fn: SpawnFn::new(move |supervisor_cell, child_id| {
            let app = app.clone();
            let session_id = session_id.clone();

            async move {
                let rec_args = RecArgs {
                    app_dir: tauri::Manager::path(&app).app_data_dir().unwrap(),
                    session_id: session_id.clone(),
                };

                let (rec_ref, _) = Actor::spawn_linked(
                    Some(child_id.into()),
                    RecorderActor,
                    rec_args,
                    supervisor_cell,
                )
                .await?;

                Ok(rec_ref.get_cell())
            }
        }),
        backoff_fn: None,
        reset_after: None,
    })
}

fn build_listener_spec(args: &LiveSupervisorArgs) -> ChildSpec {
    let ctx = args.ctx.clone();
    let app = args.app.clone();
    let languages = args.languages.clone();
    let onboarding = args.onboarding;
    let model = args.model.clone();
    let base_url = args.base_url.clone();
    let api_key = args.api_key.clone();
    let keywords = args.keywords.clone();
    let session_started_at = args.session_started_at;
    let session_started_at_unix = args.session_started_at_unix;

    ChildSpec {
        id: ListenerActor::name().to_string(),
        restart: Restart::Transient,
        spawn_fn: SpawnFn::new(move |supervisor_cell, child_id| {
            let ctx = ctx.clone();
            let app = app.clone();
            let languages = languages.clone();
            let model = model.clone();
            let base_url = base_url.clone();
            let api_key = api_key.clone();
            let keywords = keywords.clone();

            let supervisor_ref: ActorRef<SupervisorMsg> = supervisor_cell.clone().into();

            async move {
                let snapshot = ctx.read().await;
                let listener_args = ListenerArgs {
                    app: app.clone(),
                    languages: languages.clone(),
                    onboarding,
                    model: model.clone(),
                    base_url: base_url.clone(),
                    api_key: api_key.clone(),
                    keywords: keywords.clone(),
                    mode: snapshot.mode,
                    sample_rate: snapshot.sample_rate,
                    supervisor: supervisor_ref.clone(),
                    session_started_at,
                    session_started_at_unix,
                };

                let (listener_ref, _) = Actor::spawn_linked(
                    Some(child_id.into()),
                    ListenerActor,
                    listener_args,
                    supervisor_cell,
                )
                .await?;

                Ok(listener_ref.get_cell())
            }
        }),
        backoff_fn: None,
        reset_after: Some(Duration::from_secs(60)),
    }
}
