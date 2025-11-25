use ractor::{ActorCell, ActorProcessingErr, ActorRef};
use ractor_supervisor::dynamic::{
    DynamicSupervisor, DynamicSupervisorMsg, DynamicSupervisorOptions,
};

pub type SupervisorRef = ActorRef<DynamicSupervisorMsg>;
pub type SupervisorHandle = tokio::task::JoinHandle<()>;

pub const SUPERVISOR_NAME: &str = "listener_supervisor";

fn make_supervisor_options() -> DynamicSupervisorOptions {
    DynamicSupervisorOptions {
        max_children: Some(10),
        max_restarts: 50,
        max_window: ractor::concurrency::Duration::from_secs(60),
        reset_after: Some(ractor::concurrency::Duration::from_secs(30)),
    }
}

pub async fn spawn_listener_supervisor(
    parent: Option<ActorCell>,
) -> Result<(SupervisorRef, SupervisorHandle), ActorProcessingErr> {
    let options = make_supervisor_options();

    let (supervisor_ref, handle) =
        DynamicSupervisor::spawn(SUPERVISOR_NAME.to_string(), options).await?;

    if let Some(parent_cell) = parent {
        supervisor_ref.get_cell().link(parent_cell);
    }

    Ok((supervisor_ref, handle))
}
