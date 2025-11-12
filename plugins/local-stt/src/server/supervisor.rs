use ractor::{concurrency::Duration, registry, ActorCell, ActorProcessingErr, ActorRef};
use ractor_supervisor::{
    core::{ChildSpec, Restart, SpawnFn, SupervisorError},
    dynamic::{DynamicSupervisor, DynamicSupervisorMsg, DynamicSupervisorOptions},
};

use super::{
    external::{ExternalSTTActor, ExternalSTTArgs},
    internal::{InternalSTTActor, InternalSTTArgs},
    ServerType,
};

pub type SupervisorRef = ActorRef<DynamicSupervisorMsg>;

pub const INTERNAL_STT_ACTOR_NAME: &str = "internal_stt";
pub const EXTERNAL_STT_ACTOR_NAME: &str = "external_stt";
pub const SUPERVISOR_NAME: &str = "stt_supervisor";

pub async fn spawn_stt_supervisor() -> Result<ActorRef<DynamicSupervisorMsg>, ActorProcessingErr> {
    let options = DynamicSupervisorOptions {
        max_children: Some(1),
        max_restarts: 5,
        max_window: Duration::from_secs(5),
        reset_after: None,
    };

    let (supervisor_ref, _handle) =
        DynamicSupervisor::spawn(SUPERVISOR_NAME.to_string(), options).await?;

    Ok(supervisor_ref)
}

pub async fn start_internal_stt(
    supervisor: &ActorRef<DynamicSupervisorMsg>,
    args: InternalSTTArgs,
) -> Result<(), ActorProcessingErr> {
    let child_spec = create_internal_child_spec_with_args(args);
    DynamicSupervisor::spawn_child(supervisor.clone(), child_spec).await
}

pub async fn start_external_stt(
    supervisor: &ActorRef<DynamicSupervisorMsg>,
    args: ExternalSTTArgs,
) -> Result<(), ActorProcessingErr> {
    let child_spec = create_external_child_spec_with_args(args);
    DynamicSupervisor::spawn_child(supervisor.clone(), child_spec).await
}

fn create_internal_child_spec_with_args(args: InternalSTTArgs) -> ChildSpec {
    let spawn_fn = SpawnFn::new(move |supervisor: ActorCell, child_id: String| {
        let args = args.clone();
        async move {
            let (actor_ref, _handle) =
                DynamicSupervisor::spawn_linked(child_id, InternalSTTActor, args, supervisor)
                    .await?;
            Ok(actor_ref.get_cell())
        }
    });

    ChildSpec {
        id: INTERNAL_STT_ACTOR_NAME.to_string(),
        spawn_fn,
        restart: Restart::Transient,
        backoff_fn: None,
        reset_after: None,
    }
}

fn create_external_child_spec_with_args(args: ExternalSTTArgs) -> ChildSpec {
    let spawn_fn = SpawnFn::new(move |supervisor: ActorCell, child_id: String| {
        let args = args.clone();
        async move {
            let (actor_ref, _handle) =
                DynamicSupervisor::spawn_linked(child_id, ExternalSTTActor, args, supervisor)
                    .await?;
            Ok(actor_ref.get_cell())
        }
    });

    ChildSpec {
        id: EXTERNAL_STT_ACTOR_NAME.to_string(),
        spawn_fn,
        restart: Restart::Transient,
        backoff_fn: None,
        reset_after: None,
    }
}

pub async fn stop_stt_server(
    supervisor: &ActorRef<DynamicSupervisorMsg>,
    server_type: ServerType,
) -> Result<(), ActorProcessingErr> {
    let child_id = match server_type {
        ServerType::Internal => INTERNAL_STT_ACTOR_NAME,
        ServerType::External => EXTERNAL_STT_ACTOR_NAME,
    };

    let result = DynamicSupervisor::terminate_child(supervisor.clone(), child_id.to_string()).await;

    if let Err(e) = result {
        if let Some(supervisor_error) = e.downcast_ref::<SupervisorError>() {
            if matches!(supervisor_error, SupervisorError::ChildNotFound { .. }) {
                return Ok(());
            }
        }
        return Err(e);
    }

    match server_type {
        ServerType::Internal => wait_for_actor_shutdown(InternalSTTActor::name()).await,
        ServerType::External => wait_for_actor_shutdown(ExternalSTTActor::name()).await,
    }

    Ok(())
}

pub async fn stop_all_stt_servers(
    supervisor: &ActorRef<DynamicSupervisorMsg>,
) -> Result<(), ActorProcessingErr> {
    let _ = stop_stt_server(supervisor, ServerType::Internal).await;
    let _ = stop_stt_server(supervisor, ServerType::External).await;
    Ok(())
}

async fn wait_for_actor_shutdown(actor_name: ractor::ActorName) {
    for _ in 0..20 {
        if registry::where_is(actor_name.clone()).is_none() {
            break;
        }
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;
    }
}
