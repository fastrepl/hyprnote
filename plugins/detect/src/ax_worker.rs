use std::panic::AssertUnwindSafe;
use std::sync::{Arc, Mutex, mpsc};
use std::time::Duration;

use tokio::sync::oneshot;

type Job = Box<dyn FnOnce() + Send>;
type Inspections = Vec<anlg_detect::MeetingAccessibilityInspection>;
type InspectFn = dyn Fn() -> Inspections + Send + Sync;

// Accessibility IPC is synchronous and can stall for minutes on large browser trees.
// Every AX call runs on this one dedicated thread so a slow or hung walk can only
// delay AX features; it never occupies the async runtime that drives capture and STT,
// and it never runs several walks against the same app at once.
pub(crate) struct AxWorker {
    jobs: mpsc::Sender<Job>,
    inspect: Arc<InspectFn>,
    pending_inspection: Arc<Mutex<Option<Vec<oneshot::Sender<Inspections>>>>>,
}

impl Default for AxWorker {
    fn default() -> Self {
        Self::new(Arc::new(anlg_detect::inspect_meeting_accessibility))
    }
}

impl AxWorker {
    fn new(inspect: Arc<InspectFn>) -> Self {
        let (jobs, queue) = mpsc::channel::<Job>();
        let spawned = std::thread::Builder::new()
            .name("meeting-ax".to_string())
            .spawn(move || {
                for job in queue {
                    let _ = std::panic::catch_unwind(AssertUnwindSafe(job));
                }
            });
        if let Err(error) = spawned {
            tracing::error!(%error, "meeting_ax_worker_spawn_failed");
        }

        Self {
            jobs,
            inspect,
            pending_inspection: Default::default(),
        }
    }

    pub(crate) async fn run<T: Send + 'static>(
        &self,
        timeout: Duration,
        f: impl FnOnce() -> T + Send + 'static,
    ) -> Result<T, String> {
        let (tx, rx) = oneshot::channel();
        self.jobs
            .send(Box::new(move || {
                if !tx.is_closed() {
                    let _ = tx.send(f());
                }
            }))
            .map_err(|_| WORKER_STOPPED.to_string())?;
        wait(rx, timeout).await
    }

    /// Concurrent callers that arrive before a queued walk starts share its result.
    pub(crate) async fn inspect(&self, timeout: Duration) -> Result<Inspections, String> {
        let (tx, rx) = oneshot::channel();
        let queue_walk = {
            let mut pending = lock(&self.pending_inspection);
            match pending.as_mut() {
                Some(waiters) => {
                    waiters.push(tx);
                    false
                }
                None => {
                    *pending = Some(vec![tx]);
                    true
                }
            }
        };

        if queue_walk {
            let pending = self.pending_inspection.clone();
            let inspect = self.inspect.clone();
            let queued = self.jobs.send(Box::new(move || {
                let waiters: Vec<_> = lock(&pending)
                    .take()
                    .unwrap_or_default()
                    .into_iter()
                    .filter(|waiter| !waiter.is_closed())
                    .collect();
                if waiters.is_empty() {
                    return;
                }
                let inspections = inspect();
                for waiter in waiters {
                    let _ = waiter.send(inspections.clone());
                }
            }));
            if queued.is_err() {
                lock(&self.pending_inspection).take();
                return Err(WORKER_STOPPED.to_string());
            }
        }

        wait(rx, timeout).await
    }
}

const WORKER_STOPPED: &str = "meeting accessibility worker is not running";

async fn wait<T>(rx: oneshot::Receiver<T>, timeout: Duration) -> Result<T, String> {
    match tokio::time::timeout(timeout, rx).await {
        Ok(Ok(value)) => Ok(value),
        Ok(Err(_)) => Err(WORKER_STOPPED.to_string()),
        Err(_) => Err(format!(
            "meeting accessibility timed out after {}s",
            timeout.as_secs_f32()
        )),
    }
}

fn lock<T>(mutex: &Mutex<T>) -> std::sync::MutexGuard<'_, T> {
    mutex
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};

    #[tokio::test(flavor = "current_thread")]
    async fn hung_walk_times_out_without_replaying_stale_requests() {
        let walks = Arc::new(AtomicUsize::new(0));
        let (release_tx, release_rx) = mpsc::channel::<()>();
        let release_rx = Mutex::new(release_rx);
        let worker = AxWorker::new(Arc::new({
            let walks = walks.clone();
            move || {
                if walks.fetch_add(1, Ordering::SeqCst) == 0 {
                    let _ = lock(&release_rx).recv();
                }
                Vec::new()
            }
        }));

        let short = Duration::from_millis(50);
        assert!(worker.inspect(short).await.is_err());
        assert!(worker.inspect(short).await.is_err());

        release_tx.send(()).unwrap();
        let long = Duration::from_secs(5);
        let (first, second) = tokio::join!(worker.inspect(long), worker.inspect(long));
        assert!(first.is_ok() && second.is_ok());
        assert_eq!(walks.load(Ordering::SeqCst), 2);
    }
}
