use crate::BackgroundTask;
use std::process::Command;
use tokio::time::{interval, Duration};

// Common meeting applications on Linux
const MEETING_APP_LIST: [&str; 6] = [
    "zoom",           // Zoom
    "teams",          // Microsoft Teams
    "skypeforlinux",  // Skype
    "discord",        // Discord
    "slack",          // Slack
    "jitsi-meet",     // Jitsi Meet
];

pub struct Detector {
    background: BackgroundTask,
}

impl Default for Detector {
    fn default() -> Self {
        Self {
            background: BackgroundTask::default(),
        }
    }
}

impl crate::Observer for Detector {
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
                            .args(["aux"])
                            .output()
                        {
                            if let Ok(stdout) = String::from_utf8(output.stdout) {
                                for app in &MEETING_APP_LIST {
                                    if stdout.contains(app) {
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

    fn stop(&mut self) {
        self.background.stop();
    }
}