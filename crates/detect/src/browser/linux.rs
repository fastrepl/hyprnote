use crate::BackgroundTask;
use std::process::Command;
use tokio::time::{interval, Duration};

// Common browsers on Linux
const BROWSER_NAMES: [&str; 4] = [
    "firefox",
    "chrome",
    "chromium",
    "brave",
];

pub struct Detector {
    background: BackgroundTask,
    detected_browsers: std::collections::HashSet<String>,
}

impl Default for Detector {
    fn default() -> Self {
        Self {
            background: BackgroundTask::default(),
            detected_browsers: std::collections::HashSet::new(),
        }
    }
}

impl crate::Observer for Detector {
    fn start(&mut self, f: crate::DetectCallback) {
        let mut detected_browsers = self.detected_browsers.clone();

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
                        if let Ok(output) = Command::new("ps")
                            .args(["aux"])
                            .output()
                        {
                            if let Ok(stdout) = String::from_utf8(output.stdout) {
                                for browser in &BROWSER_NAMES {
                                    if stdout.contains(browser) && !detected_browsers.contains(*browser) {
                                        detected_browsers.insert(browser.to_string());
                                        // For now, just report that a browser is running
                                        // In a future implementation, we could try to extract URLs
                                        f(format!("{} running", browser));
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
    }

    fn stop(&mut self) {
        self.background.stop();
        self.detected_browsers.clear();
    }
}