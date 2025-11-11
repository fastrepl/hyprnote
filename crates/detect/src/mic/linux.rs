use crate::BackgroundTask;
use std::process::Command;
use tokio::time::{interval, Duration};

pub struct Detector {
    background: BackgroundTask,
}

impl Default for Detector {
    /// Creates a `Detector` initialized with a default background task.
    ///
    /// # Examples
    ///
    /// ```
    /// let _ = Detector::default();
    /// ```
    fn default() -> Self {
        Self {
            background: BackgroundTask::default(),
        }
    }
}

impl crate::Observer for Detector {
    /// Starts background monitoring for microphone usage and invokes the callback when usage is detected.
    ///
    /// The detector spawns a background task that checks the system PulseAudio source outputs every 2 seconds.
    /// When a microphone source output is present, the provided callback `f` is called with the event name
    /// `"microphone_in_use"`.
    ///
    /// # Parameters
    ///
    /// - `f`: Callback invoked with a single `String` argument containing the event name when microphone usage is detected.
    ///
    /// # Examples
    ///
    /// ```
    /// use crates_detect::mic::linux::Detector;
    ///
    /// let mut detector = Detector::default();
    /// detector.start(|event| {
    ///     // handle events such as "microphone_in_use"
    ///     println!("Event: {}", event);
    /// });
    /// detector.stop();
    /// ```
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

    /// Stops the detector's background monitoring task.
    ///
    /// Terminates any running background task started by `start`.
    ///
    /// # Examples
    ///
    /// ```
    /// let mut detector = Detector::default();
    /// detector.stop();
    /// ```
    fn stop(&mut self) {
        self.background.stop();
    }
}

/// Checks whether any PulseAudio source outputs (applications using the microphone) are active.
///
/// Runs `pactl list source-outputs short` and returns `true` if the command produced non-empty stdout,
/// indicating one or more active microphone streams. If the command fails or produces empty output,
/// this function returns `false`.
///
/// # Examples
///
/// ```
/// let in_use = is_microphone_in_use();
/// // `in_use` is `true` if any application is currently using the microphone.
/// ```
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
