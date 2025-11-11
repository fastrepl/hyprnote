use std::sync::Arc;
use tokio::time::Duration;

use ractor::{Actor, ActorRef, SpawnErr};
use ractor_supervisor::{
    ChildSpec, Restart, SpawnFn, Supervisor, SupervisorArguments, SupervisorMsg, SupervisorOptions,
    SupervisorStrategy,
};

use super::{
    live_supervisor_spec, ControllerActor, ControllerActorArgs, SessionParams, SessionShared,
};

pub const SESSION_SUPERVISOR_NAME: &str = "session_supervisor";

pub async fn start_session_supervisor(
    app: tauri::AppHandle,
    params: SessionParams,
) -> Result<(ActorRef<SupervisorMsg>, ractor::concurrency::JoinHandle<()>), SpawnErr> {
    let shared = SessionShared::new(app, params);

    let child_specs = vec![
        controller_actor_spec(shared.clone()),
        live_supervisor_spec(shared.clone()),
    ];

    let supervisor_options = SupervisorOptions {
        strategy: SupervisorStrategy::RestForOne,
        max_restarts: 5,
        max_window: Duration::from_secs(10),
        reset_after: Some(Duration::from_secs(30)),
    };

    Supervisor::spawn(
        SESSION_SUPERVISOR_NAME.into(),
        SupervisorArguments {
            child_specs,
            options: supervisor_options,
        },
    )
    .await
}

fn controller_actor_spec(shared: Arc<SessionShared>) -> ChildSpec {
    ChildSpec {
        id: ControllerActor::name().to_string(),
        restart: Restart::Transient,
        spawn_fn: SpawnFn::new(move |supervisor_cell, child_id| {
            let shared = shared.clone();

            async move {
                let supervisor_ref: ActorRef<SupervisorMsg> = supervisor_cell.clone().into();
                let args = ControllerActorArgs {
                    shared,
                    supervisor: supervisor_ref,
                };

                let (controller_ref, _) = Actor::spawn_linked(
                    Some(child_id.into()),
                    ControllerActor,
                    args,
                    supervisor_cell,
                )
                .await?;

                Ok(controller_ref.get_cell())
            }
        }),
        backoff_fn: None,
        reset_after: Some(Duration::from_secs(60)),
    }
}
