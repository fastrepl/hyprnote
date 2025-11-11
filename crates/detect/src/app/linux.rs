use crate::BackgroundTask;
use std::process::Command;
use tokio::time::{interval, Duration};

// Common meeting applications on Linux
const MEETING_APP_LIST: [&str; 6] = [
    "zoom",          // Zoom
    "teams",         // Microsoft Teams
    "skypeforlinux", // Skype
    "discord",       // Discord
    "slack",         // Slack
    "jitsi-meet",    // Jitsi Meet
];

pub struct Detector {
    background: BackgroundTask,
}

impl Default for Detector {
    /// Creates a `Detector` with its background task initialized to the default.

    ///

    /// # Examples

    ///

    /// ```

    /// let _detector = Detector::default();

    /// ```
    fn default() -> Self {
        Self {
            background: BackgroundTask::default(),
        }
    }
}

impl crate::Observer for Detector {
    /// Starts a background detector that periodically scans running processes and invokes `f` for each detected meeting application.
    ///
    /// The callback `f` will be called with the detected application's name each time the detector finds a matching process.
    ///
    /// # Parameters
    ///
    /// - `f`: Callback invoked with the detected application's name.
    ///
    /// # Examples
    ///
    /// ```
    /// use detect::app::linux::Detector;
    ///
    /// let mut detector = Detector::default();
    /// detector.start(|app_name: String| {
    ///     println!("Detected meeting app: {}", app_name);
    /// });
    /// // ...later
    /// detector.stop();
    /// ```
    fn start(&mut self, f: crate::DetectCallback) {
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

                        // Check for running meeting applications
                        if let Ok(output) = Command::new("ps")
                            .args(["-eo", "comm"])
                            .output()
                        {
                            if let Ok(stdout) = String::from_utf8(output.stdout) {
                                let running_processes: std::collections::HashSet<&str> = stdout
                                    .lines()
                                    .skip(1) // Skip header line
                                    .map(|line| line.trim())
                                    .collect();

                                for &app in &MEETING_APP_LIST {
                                    if running_processes.contains(app) {
                                        f(app.to_string());
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
    }

    /// Stops the detector's background task.
    ///
    /// # Examples
    ///
    /// ```
    /// let mut detector = Detector::default();
    /// // start would normally be called before stop in real usage
    /// detector.stop();
    /// ```
    fn stop(&mut self) {
        self.background.stop();
    }
}
