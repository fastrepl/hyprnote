use std::sync::Arc;
use tokio::sync::{watch, Mutex};

#[derive(Clone)]
pub struct ModelManager {
    model_path: std::path::PathBuf,
    model: Arc<Mutex<Option<Arc<hypr_llama::Llama>>>>,
    last_activity: Arc<Mutex<Option<tokio::time::Instant>>>,
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
    pub fn new(model_path: impl Into<std::path::PathBuf>) -> Self {
        let (shutdown_tx, shutdown_rx) = watch::channel(());

        let manager = Self {
            model_path: model_path.into(),
            model: Arc::new(tokio::sync::Mutex::new(None)),
            last_activity: Arc::new(tokio::sync::Mutex::new(None)),
            _drop_guard: Arc::new(DropGuard { shutdown_tx }),
        };

        manager.monitor(shutdown_rx);
        manager
    }

    pub async fn update_activity(&self) {
        *self.last_activity.lock().await = Some(tokio::time::Instant::now());
    }

    pub async fn get_model(&self) -> Result<std::sync::Arc<hypr_llama::Llama>, crate::Error> {
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

    fn monitor(&self, shutdown_rx: watch::Receiver<()>) {
        let activity_check_interval = std::time::Duration::from_secs(3);
        let inactivity_threshold = std::time::Duration::from_secs(150);

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
