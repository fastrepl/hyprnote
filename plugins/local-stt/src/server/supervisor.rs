use ractor::{concurrency::Duration, registry, ActorCell, ActorProcessingErr, ActorRef};
use ractor_supervisor::{
    core::{ChildBackoffFn, ChildSpec, Restart, SpawnFn, SupervisorError},
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

pub async fn spawn_stt_supervisor(
) -> Result<(ActorRef<DynamicSupervisorMsg>, crate::SupervisorHandle), ActorProcessingErr> {
    let options = DynamicSupervisorOptions {
        max_children: Some(1),
        max_restarts: 100,
        max_window: Duration::from_secs(60 * 3),
        reset_after: Some(Duration::from_secs(30)),
    };

    let (supervisor_ref, handle) =
        DynamicSupervisor::spawn(SUPERVISOR_NAME.to_string(), options).await?;

    Ok((supervisor_ref, handle))
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
        backoff_fn: Some(ChildBackoffFn::new(|_, _, _, _| {
            Some(Duration::from_millis(500))
        })),
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
        backoff_fn: Some(ChildBackoffFn::new(|_, _, _, _| {
            Some(Duration::from_secs(1))
        })),
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

    if matches!(server_type, ServerType::External) {
        wait_for_process_cleanup().await;
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
    for _ in 0..50 {
        if registry::where_is(actor_name.clone()).is_none() {
            break;
        }
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;
    }
}

pub struct ProcessCleanupDeps<F1, F2, F3>
where
    F1: Fn(
            hypr_host::ProcessMatcher,
            u64,
            u64,
        ) -> std::pin::Pin<Box<dyn std::future::Future<Output = bool> + Send>>
        + Send
        + Sync,
    F2: Fn(hypr_host::ProcessMatcher) -> u16 + Send + Sync,
    F3: Fn(std::time::Duration) -> std::pin::Pin<Box<dyn std::future::Future<Output = ()> + Send>>
        + Send
        + Sync,
{
    pub wait_for_termination: F1,
    pub kill_processes: F2,
    pub sleep: F3,
}

impl
    ProcessCleanupDeps<
        fn(
            hypr_host::ProcessMatcher,
            u64,
            u64,
        ) -> std::pin::Pin<Box<dyn std::future::Future<Output = bool> + Send>>,
        fn(hypr_host::ProcessMatcher) -> u16,
        fn(std::time::Duration) -> std::pin::Pin<Box<dyn std::future::Future<Output = ()> + Send>>,
    >
{
    pub fn production() -> Self {
        Self {
            wait_for_termination: |matcher, max_wait, interval| {
                Box::pin(hypr_host::wait_for_processes_to_terminate(
                    matcher, max_wait, interval,
                ))
            },
            kill_processes: hypr_host::kill_processes_by_matcher,
            sleep: |duration| Box::pin(tokio::time::sleep(duration)),
        }
    }
}

async fn wait_for_process_cleanup_with<F1, F2, F3>(deps: &ProcessCleanupDeps<F1, F2, F3>)
where
    F1: Fn(
            hypr_host::ProcessMatcher,
            u64,
            u64,
        ) -> std::pin::Pin<Box<dyn std::future::Future<Output = bool> + Send>>
        + Send
        + Sync,
    F2: Fn(hypr_host::ProcessMatcher) -> u16 + Send + Sync,
    F3: Fn(std::time::Duration) -> std::pin::Pin<Box<dyn std::future::Future<Output = ()> + Send>>
        + Send
        + Sync,
{
    let process_terminated =
        (deps.wait_for_termination)(hypr_host::ProcessMatcher::Sidecar, 5000, 100).await;

    if !process_terminated {
        tracing::warn!("external_stt_process_did_not_terminate_in_time");
        let killed = (deps.kill_processes)(hypr_host::ProcessMatcher::Sidecar);
        if killed > 0 {
            tracing::info!("force_killed_stt_processes: {}", killed);
            (deps.sleep)(std::time::Duration::from_millis(500)).await;
        }
    }
}

async fn wait_for_process_cleanup() {
    let deps = ProcessCleanupDeps::production();
    wait_for_process_cleanup_with(&deps).await;
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{Arc, Mutex};

    #[tokio::test]
    async fn test_cleanup_process_terminates_gracefully() {
        let kill_called = Arc::new(Mutex::new(false));
        let kill_called_clone = kill_called.clone();

        let deps = ProcessCleanupDeps {
            wait_for_termination: |_, _, _| Box::pin(async { true }),
            kill_processes: move |_| {
                *kill_called_clone.lock().unwrap() = true;
                0
            },
            sleep: |_| Box::pin(async {}),
        };

        wait_for_process_cleanup_with(&deps).await;

        assert!(
            !*kill_called.lock().unwrap(),
            "kill_processes should not be called when process terminates gracefully"
        );
    }

    #[tokio::test]
    async fn test_cleanup_process_never_terminates() {
        let kill_called = Arc::new(Mutex::new(false));
        let kill_called_clone = kill_called.clone();
        let sleep_called = Arc::new(Mutex::new(false));
        let sleep_called_clone = sleep_called.clone();

        let deps = ProcessCleanupDeps {
            wait_for_termination: |_, _, _| Box::pin(async { false }),
            kill_processes: move |_| {
                *kill_called_clone.lock().unwrap() = true;
                1
            },
            sleep: move |_| {
                let sleep_called = sleep_called_clone.clone();
                Box::pin(async move {
                    *sleep_called.lock().unwrap() = true;
                })
            },
        };

        wait_for_process_cleanup_with(&deps).await;

        assert!(
            *kill_called.lock().unwrap(),
            "kill_processes should be called when process doesn't terminate"
        );
        assert!(
            *sleep_called.lock().unwrap(),
            "sleep should be called after killing processes"
        );
    }

    #[tokio::test]
    async fn test_cleanup_process_kill_returns_zero() {
        let kill_called = Arc::new(Mutex::new(false));
        let kill_called_clone = kill_called.clone();
        let sleep_called = Arc::new(Mutex::new(false));
        let sleep_called_clone = sleep_called.clone();

        let deps = ProcessCleanupDeps {
            wait_for_termination: |_, _, _| Box::pin(async { false }),
            kill_processes: move |_| {
                *kill_called_clone.lock().unwrap() = true;
                0
            },
            sleep: move |_| {
                let sleep_called = sleep_called_clone.clone();
                Box::pin(async move {
                    *sleep_called.lock().unwrap() = true;
                })
            },
        };

        wait_for_process_cleanup_with(&deps).await;

        assert!(
            *kill_called.lock().unwrap(),
            "kill_processes should be called when process doesn't terminate"
        );
        assert!(
            !*sleep_called.lock().unwrap(),
            "sleep should not be called when kill returns 0"
        );
    }
}
