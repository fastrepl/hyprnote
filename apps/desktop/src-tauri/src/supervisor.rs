use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

use ractor::concurrency::Duration;
use ractor::ActorRef;
use ractor_supervisor::dynamic::{
    DynamicSupervisor, DynamicSupervisorMsg, DynamicSupervisorOptions,
};

pub type SupervisorRef = ActorRef<DynamicSupervisorMsg>;
pub type SupervisorHandle = tokio::task::JoinHandle<()>;

const ROOT_SUPERVISOR_NAME: &str = "root_supervisor";

#[derive(Clone)]
pub struct SupervisorState {
    pub is_exiting: Arc<AtomicBool>,
}

impl SupervisorState {
    pub fn new() -> Self {
        Self {
            is_exiting: Arc::new(AtomicBool::new(false)),
        }
    }

    pub fn set_exiting(&self) {
        self.is_exiting.store(true, Ordering::Release);
    }

    pub fn is_exiting(&self) -> bool {
        self.is_exiting.load(Ordering::Acquire)
    }
}

pub async fn spawn_root_supervisor() -> Option<(SupervisorRef, SupervisorHandle)> {
    let options = DynamicSupervisorOptions {
        max_children: Some(10),
        max_restarts: 50,
        max_window: Duration::from_secs(60),
        reset_after: Some(Duration::from_secs(30)),
    };

    match DynamicSupervisor::spawn(ROOT_SUPERVISOR_NAME.to_string(), options).await {
        Ok((supervisor_ref, handle)) => {
            tracing::info!("root_supervisor_spawned");
            Some((supervisor_ref, handle))
        }
        Err(e) => {
            tracing::error!("failed_to_spawn_root_supervisor: {:?}", e);
            None
        }
    }
}
