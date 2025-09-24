use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;

use tokio::sync::{watch, Mutex};

#[derive(Default)]
pub struct ModelManagerBuilder {
    model_path: Option<PathBuf>,
    activity_check_interval: Option<Duration>,
    inactivity_threshold: Option<Duration>,
}

impl ModelManagerBuilder {
    pub fn model_path(mut self, v: impl Into<PathBuf>) -> Self {
        self.model_path = Some(v.into());
        self
    }

    pub fn activity_check_interval(mut self, v: Duration) -> Self {
        self.activity_check_interval = Some(v);
        self
    }

    pub fn inactivity_threshold(mut self, v: Duration) -> Self {
        self.inactivity_threshold = Some(v);
        self
    }

    pub fn build(self) -> ModelManager {
        let (shutdown_tx, shutdown_rx) = watch::channel(());

        let manager = ModelManager {
            model_path: self.model_path.unwrap(),
            model: Arc::new(tokio::sync::Mutex::new(None)),
            last_activity: Arc::new(tokio::sync::Mutex::new(None)),
            activity_check_interval: self
                .activity_check_interval
                .unwrap_or(Duration::from_secs(3)),
            inactivity_threshold: self
                .inactivity_threshold
                .unwrap_or(Duration::from_secs(150)),
            _drop_guard: Arc::new(DropGuard { shutdown_tx }),
        };

        manager.monitor(shutdown_rx);
        manager
    }
}

#[derive(Clone)]
pub struct ModelManager {
    model_path: PathBuf,
    model: Arc<Mutex<Option<Arc<hypr_llama::Llama>>>>,
    last_activity: Arc<Mutex<Option<tokio::time::Instant>>>,
    activity_check_interval: Duration,
    inactivity_threshold: Duration,
    _drop_guard: Arc<DropGuard>,
}

struct DropGuard {
    shutdown_tx: watch::Sender<()>,
}

impl Drop for DropGuard {
    fn drop(&mut self) {
        let _ = self.shutdown_tx.send(());
    }
}

impl ModelManager {
    pub fn builder() -> ModelManagerBuilder {
        ModelManagerBuilder::default()
    }

    pub async fn get_model(&self) -> Result<Arc<hypr_llama::Llama>, crate::Error> {
        self.update_activity().await;

        let mut guard = self.model.lock().await;

        match guard.as_ref() {
            Some(model) => Ok(model.clone()),
            None => {
                if !self.model_path.exists() {
                    return Err(crate::Error::ModelNotDownloaded);
                }

                let model = Arc::new(hypr_llama::Llama::new(&self.model_path)?);
                *guard = Some(model.clone());
                Ok(model)
            }
        }
    }

    pub async fn update_activity(&self) {
        *self.last_activity.lock().await = Some(tokio::time::Instant::now());
    }

    fn monitor(&self, shutdown_rx: watch::Receiver<()>) {
        let activity_check_interval = self.activity_check_interval;
        let inactivity_threshold = self.inactivity_threshold;

        let model = self.model.clone();
        let last_activity = self.last_activity.clone();

        let _handle = tokio::spawn(async move {
            let mut shutdown_rx = shutdown_rx;
            let mut interval = tokio::time::interval(activity_check_interval);

            interval.tick().await;

            loop {
                tokio::select! {
                    _ = shutdown_rx.changed() => {
                        break;
                    },
                    _ = interval.tick() => {
                        let should_unload = match *last_activity.lock().await {
                            Some(last_time) if last_time.elapsed() > inactivity_threshold => {
                                model.lock().await.is_some()
                            },
                            _ => false
                        };

                        if should_unload {
                            *model.lock().await = None;
                        }
                    }
                }
            }
        });
    }
}
