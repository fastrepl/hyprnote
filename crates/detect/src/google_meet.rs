use std::path::PathBuf;
use std::time::{Duration, Instant};

use crate::{BackgroundTask, DetectCallback, DetectEvent};

pub struct GoogleMeetMuteWatcher {
    background: BackgroundTask,
}

impl Default for GoogleMeetMuteWatcher {
    fn default() -> Self {
        Self {
            background: BackgroundTask::default(),
        }
    }
}

struct WatcherState {
    last_mute_state: Option<bool>,
    last_check: Instant,
    last_modified: Option<std::time::SystemTime>,
    poll_interval: Duration,
}

impl WatcherState {
    fn new() -> Self {
        Self {
            last_mute_state: None,
            last_check: Instant::now(),
            last_modified: None,
            poll_interval: Duration::from_millis(500),
        }
    }
}

fn get_state_file_path() -> Option<PathBuf> {
    let data_dir = dirs::data_local_dir()?;
    Some(
        data_dir
            .join("hyprnote")
            .join("chrome_extension_state.json"),
    )
}

#[derive(serde::Deserialize)]
struct ExtensionState {
    source: String,
    muted: bool,
    timestamp: u128,
}

fn check_google_meet_mute_state(last_modified: &mut Option<std::time::SystemTime>) -> Option<bool> {
    let state_file = get_state_file_path()?;

    if !state_file.exists() {
        return None;
    }

    let metadata = std::fs::metadata(&state_file).ok()?;
    let modified = metadata.modified().ok()?;

    if *last_modified == Some(modified) {
        return None;
    }

    *last_modified = Some(modified);

    let content = std::fs::read_to_string(&state_file).ok()?;
    let state: ExtensionState = serde_json::from_str(&content).ok()?;

    if state.source != "google_meet" {
        return None;
    }

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .ok()?
        .as_millis();

    if now.saturating_sub(state.timestamp) > 5000 {
        return None;
    }

    Some(state.muted)
}

impl crate::Observer for GoogleMeetMuteWatcher {
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

                        if let Some(muted) = check_google_meet_mute_state(&mut state.last_modified) {
                            if state.last_mute_state != Some(muted) {
                                tracing::info!(muted = muted, "google meet mute state changed");
                                state.last_mute_state = Some(muted);

                                let event = DetectEvent::GoogleMeetMuteStateChanged { value: muted };
                                f(event);
                            }
                        }

                        state.last_check = Instant::now();
                    }
                }
            }

            tracing::info!("google meet mute watcher stopped");
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
    fn test_get_state_file_path() {
        let path = get_state_file_path();
        assert!(path.is_some());
    }
}
