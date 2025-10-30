use std::process::Command;
use std::time::{Duration, Instant};

use crate::{BackgroundTask, DetectCallback, DetectEvent};

const ZOOM_BUNDLE_ID: &str = "us.zoom.xos";

pub struct ZoomMuteWatcher {
    background: BackgroundTask,
}

impl Default for ZoomMuteWatcher {
    fn default() -> Self {
        Self {
            background: BackgroundTask::default(),
        }
    }
}

struct WatcherState {
    last_mute_state: Option<bool>,
    last_check: Instant,
    poll_interval: Duration,
}

impl WatcherState {
    fn new() -> Self {
        Self {
            last_mute_state: None,
            last_check: Instant::now(),
            poll_interval: Duration::from_millis(1000),
        }
    }
}

fn check_zoom_mute_state() -> Option<bool> {
    let script = r#"
tell application "System Events"
    if (get name of every application process) contains "zoom.us" then
        tell application process "zoom.us"
            if exists (menu item "Mute audio" of menu 1 of menu bar item "Meeting" of menu bar 1) then
                return "unmuted"
            else if exists (menu item "Unmute audio" of menu 1 of menu bar item "Meeting" of menu bar 1) then
                return "muted"
            else
                return "unknown"
            end if
        end tell
    else
        return "not_running"
    end if
end tell
"#;

    let output = Command::new("osascript")
        .arg("-e")
        .arg(script)
        .output()
        .ok()?;

    if !output.status.success() {
        tracing::warn!(
            "osascript failed: {:?}",
            String::from_utf8_lossy(&output.stderr)
        );
        return None;
    }

    let result = String::from_utf8_lossy(&output.stdout).trim().to_string();

    match result.as_str() {
        "muted" => Some(true),
        "unmuted" => Some(false),
        "unknown" => {
            tracing::debug!("zoom state unknown (likely not in meeting)");
            None
        }
        "not_running" => {
            tracing::debug!("zoom not running");
            None
        }
        other => {
            tracing::warn!("unexpected osascript output: {}", other);
            None
        }
    }
}

fn is_zoom_using_mic() -> bool {
    let apps = crate::list_mic_using_apps();
    apps.iter().any(|app| app.id == ZOOM_BUNDLE_ID)
}

impl crate::Observer for ZoomMuteWatcher {
    fn start(&mut self, f: DetectCallback) {
        if self.background.is_running() {
            return;
        }

        self.background.start(|running, mut rx| async move {
            let mut state = WatcherState::new();

            loop {
                tokio::select! {
                    _ = &mut rx => {
                        break;
                    }
                    _ = tokio::time::sleep(state.poll_interval) => {
                        if !running.load(std::sync::atomic::Ordering::SeqCst) {
                            break;
                        }

                        if !is_zoom_using_mic() {
                            if state.last_mute_state.is_some() {
                                tracing::debug!("zoom no longer using mic, clearing state");
                                state.last_mute_state = None;
                            }
                            continue;
                        }

                        if let Some(muted) = check_zoom_mute_state() {
                            if state.last_mute_state != Some(muted) {
                                tracing::info!(muted = muted, "zoom mute state changed");
                                state.last_mute_state = Some(muted);

                                let event = DetectEvent::ZoomMuteStateChanged { value: muted };
                                f(event);
                            }
                        }

                        state.last_check = Instant::now();
                    }
                }
            }

            tracing::info!("zoom mute watcher stopped");
        });
    }

    fn stop(&mut self) {
        self.background.stop();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[ignore]
    fn test_check_zoom_mute_state() {
        let state = check_zoom_mute_state();
        println!("Zoom mute state: {:?}", state);
    }

    #[test]
    #[ignore]
    fn test_is_zoom_using_mic() {
        let result = is_zoom_using_mic();
        println!("Is Zoom using mic: {}", result);
    }
}
