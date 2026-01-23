use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use crate::{BackgroundTask, DetectEvent};

const POLL_INTERVAL: Duration = Duration::from_millis(500);

#[derive(Default)]
pub struct DisplayDetector {
    background: BackgroundTask,
}

struct SharedContext {
    callback: Arc<Mutex<crate::DetectCallback>>,
    was_inactive: Arc<AtomicBool>,
}

impl SharedContext {
    fn new(callback: crate::DetectCallback) -> Self {
        let was_inactive = hypr_mac::is_builtin_display_inactive();
        Self {
            callback: Arc::new(Mutex::new(callback)),
            was_inactive: Arc::new(AtomicBool::new(was_inactive)),
        }
    }

    fn emit(&self, event: DetectEvent) {
        tracing::info!(?event, "detected");
        if let Ok(guard) = self.callback.lock() {
            (*guard)(event);
        }
    }
}

impl crate::Observer for DisplayDetector {
    fn start(&mut self, f: crate::DetectCallback) {
        self.background.start(|running, mut rx| async move {
            let ctx = SharedContext::new(f);

            std::thread::spawn({
                let running = running.clone();
                let callback = ctx.callback.clone();
                let was_inactive = ctx.was_inactive.clone();

                move || {
                    loop {
                        if !running.load(Ordering::SeqCst) {
                            break;
                        }

                        std::thread::sleep(POLL_INTERVAL);

                        let is_inactive = hypr_mac::is_builtin_display_inactive();
                        let prev_inactive = was_inactive.swap(is_inactive, Ordering::SeqCst);

                        if !prev_inactive && is_inactive {
                            tracing::info!("builtin_display_became_inactive");
                            if let Ok(guard) = callback.lock() {
                                (*guard)(DetectEvent::DisplayInactive);
                            }
                        }
                    }
                }
            });

            loop {
                tokio::select! {
                    _ = &mut rx => break,
                    _ = tokio::time::sleep(Duration::from_millis(500)) => {
                        if !running.load(Ordering::SeqCst) {
                            break;
                        }
                    }
                }
            }
        });
    }

    fn stop(&mut self) {
        self.background.stop();
    }
}
