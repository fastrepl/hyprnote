use crate::BackgroundTask;
use std::process::Command;
use std::sync::{Arc, Mutex};
use tokio::time::{interval, Duration};

// Common browsers on Linux
const BROWSER_NAMES: [&str; 4] = ["firefox", "chrome", "chromium", "brave"];

pub struct Detector {
    background: BackgroundTask,
    detected_browsers: Arc<Mutex<std::collections::HashSet<String>>>,
}

impl Default for Detector {
    /// Creates a new `Detector` with default settings.
    fn default() -> Self {
        Self {
            background: BackgroundTask::default(),
            detected_browsers: Arc::new(Mutex::new(std::collections::HashSet::new())),
        }
    }
}

impl crate::Observer for Detector {
    /// Starts browser detection that monitors for running browsers every 5 seconds.
    ///
    /// Calls the provided callback once when each browser is first detected with
    /// a message in the format `"<browser> running"`.
    fn start(&mut self, f: crate::DetectCallback) {
        let detected_browsers = Arc::clone(&self.detected_browsers);

        self.background.start(|running, mut rx| async move {
            let mut interval_timer = interval(Duration::from_secs(5));

            loop {
                tokio::select! {
                    _ = &mut rx => {
                        break;
                    }
                    _ = interval_timer.tick() => {
                        if !running.load(std::sync::atomic::Ordering::SeqCst) {
                            break;
                        }

                        // Check for running browsers
                        let output = match Command::new("ps")
                            .args(["aux"])
                            .output() {
                                Ok(output) => output,
                                Err(_) => {
                                    // Silently continue if ps command fails
                                    continue;
                                }
                            };
                        
                        let stdout = match String::from_utf8(output.stdout) {
                            Ok(stdout) => stdout,
                            Err(_) => {
                                // Silently continue if output isn't valid UTF-8
                                continue;
                            }
                        };
                        
                        for browser in &BROWSER_NAMES {
                            if stdout.contains(browser) {
                                if let Ok(mut detected) = detected_browsers.lock() {
                                    if !detected.contains(*browser) {
                                        detected.insert(browser.to_string());
                                        f(format!("{} running", browser));
                                    }
                                }
                                // Silently continue if mutex is poisoned
                            }
                        }
                    }
                }
            }
        });
    }

    /// Stops the detector and clears any previously detected browsers.
    fn stop(&mut self) {
        self.background.stop();
        // Silently handle mutex errors on cleanup
        let _ = self.detected_browsers.lock().map(|mut detected| detected.clear());
    }
}
