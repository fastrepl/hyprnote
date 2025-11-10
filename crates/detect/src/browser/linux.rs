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
    /// Creates a new `Detector` with a default background task and no previously detected browsers.
    ///
    /// # Examples
    ///
    /// ```
    /// let detector = Detector::default();
    /// ```
    fn default() -> Self {
        Self {
            background: BackgroundTask::default(),
            detected_browsers: std::collections::HashSet::new(),
        }
    }
}

impl crate::Observer for Detector {
    /// Starts a background task that detects common Linux browsers and reports newly observed ones.
    ///
    /// The detector samples processes every 5 seconds (using `ps aux`) and, for each browser name in
    /// `BROWSER_NAMES`, invokes the provided callback exactly once when that browser is first observed
    /// running. The callback is called with a message in the format `"<browser> running"`.
    ///
    /// # Parameters
    ///
    /// - `f`: Callback invoked with a single `String` message when a browser is detected.
    ///
    /// # Examples
    ///
    /// ```
    /// let mut detector = crate::browser::linux::Detector::default();
    /// detector.start(|msg| println!("{}", msg));
    /// // The callback will be called asynchronously when a browser from BROWSER_NAMES is observed.
    /// ```
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

    /// Stops the detector's background task and clears the set of previously detected browsers.
    ///
    /// # Examples
    ///
    /// ```
    /// let mut det = Detector::default();
    /// det.stop();
    /// ```
    fn stop(&mut self) {
        self.background.stop();
        self.detected_browsers.clear();
    }
}