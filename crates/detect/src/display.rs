use std::sync::atomic::Ordering;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use crate::{BackgroundTask, DetectEvent};

const POLL_INTERVAL: Duration = Duration::from_millis(500);

#[derive(Default)]
pub struct DisplayDetector {
    background: BackgroundTask,
}

impl crate::Observer for DisplayDetector {
    fn start(&mut self, f: crate::DetectCallback) {
        self.background.start(|running, mut rx| async move {
            let callback = Arc::new(Mutex::new(f));
            let prev_state = Arc::new(Mutex::new(hypr_mac::get_display_state()));

            std::thread::spawn({
                let running = running.clone();
                let callback = callback.clone();
                let prev_state = prev_state.clone();

                move || {
                    loop {
                        if !running.load(Ordering::SeqCst) {
                            break;
                        }

                        std::thread::sleep(POLL_INTERVAL);

                        let current = hypr_mac::get_display_state();
                        let changed = {
                            let mut prev = prev_state.lock().unwrap();
                            if *prev != current {
                                *prev = current;
                                true
                            } else {
                                false
                            }
                        };

                        if changed {
                            tracing::info!(?current, "display_state_changed");
                            if let Ok(guard) = callback.lock() {
                                (*guard)(DetectEvent::DisplayChanged {
                                    foldable_display_active: current.foldable_display_active,
                                    external_connected: current.external_connected,
                                });
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
