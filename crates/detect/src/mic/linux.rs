use crate::BackgroundTask;
use std::process::Command;
use tokio::time::{interval, Duration};

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
            let mut interval_timer = interval(Duration::from_secs(2));

            loop {
                tokio::select! {
                    _ = &mut rx => {
                        break;
                    }
                    _ = interval_timer.tick() => {
                        if !running.load(std::sync::atomic::Ordering::SeqCst) {
                            break;
                        }

                        // Check for microphone usage via PulseAudio
                        if is_microphone_in_use() {
                            f("microphone_in_use".to_string());
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

fn is_microphone_in_use() -> bool {
    // Check if any source-outputs exist (applications using microphone)
    if let Ok(output) = Command::new("pactl")
        .args(["list", "source-outputs", "short"])
        .output()
    {
        if let Ok(stdout) = String::from_utf8(output.stdout) {
            // If there's any output, it means applications are using the microphone
            return !stdout.trim().is_empty();
        }
    }

    false
}