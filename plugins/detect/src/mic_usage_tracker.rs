use std::collections::HashMap;
use std::time::Duration;

use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_listener::ListenerPluginExt;

use crate::{DetectEvent, SharedState};

const MIC_ACTIVE_THRESHOLD: Duration = Duration::from_secs(3 * 60);

pub struct MicUsageTracker {
    timers: HashMap<String, tokio::task::JoinHandle<()>>,
}

impl Default for MicUsageTracker {
    fn default() -> Self {
        Self {
            timers: HashMap::new(),
        }
    }
}

impl MicUsageTracker {
    pub fn track_app<R: Runtime>(
        &mut self,
        app_handle: &AppHandle<R>,
        app: &hypr_detect::InstalledApp,
    ) {
        if self.timers.contains_key(&app.id) {
            return;
        }

        let handle = spawn_timer(app_handle.clone(), app.clone(), MIC_ACTIVE_THRESHOLD);
        self.timers.insert(app.id.clone(), handle);
    }

    pub fn cancel_app(&mut self, app_id: &str) {
        if let Some(handle) = self.timers.remove(app_id) {
            handle.abort();
            tracing::info!(app_id = %app_id, "cancelled_mic_active_timer");
        }
    }

    pub fn is_tracked(&self, app_id: &str) -> bool {
        self.timers.contains_key(app_id)
    }

    pub fn remove_completed(&mut self, app_id: &str) {
        self.timers.remove(app_id);
    }
}

fn spawn_timer<R: Runtime>(
    app_handle: AppHandle<R>,
    app: hypr_detect::InstalledApp,
    threshold: Duration,
) -> tokio::task::JoinHandle<()> {
    let duration_secs = threshold.as_secs();
    let app_id = app.id.clone();
    tokio::spawn(async move {
        tokio::time::sleep(threshold).await;

        let state = app_handle.state::<SharedState>();
        let mut state_guard = state.lock().await;

        if !state_guard.mic_usage_tracker.is_tracked(&app_id) {
            return;
        }

        state_guard.mic_usage_tracker.remove_completed(&app_id);

        let is_listening = {
            let listener_state = app_handle.listener().get_state().await;
            matches!(
                listener_state,
                tauri_plugin_listener::State::Active | tauri_plugin_listener::State::Finalizing
            )
        };

        if is_listening {
            tracing::info!(
                app_id = %app_id,
                "skip_mic_active_without_hyprnote: hyprnote_is_listening"
            );
            return;
        }

        tracing::info!(
            app_id = %app_id,
            duration_secs,
            "mic_active_without_hyprnote"
        );
        let key = uuid::Uuid::new_v4().to_string();
        drop(state_guard);
        super::handler::emit_to_main(
            &app_handle,
            DetectEvent::MicActiveWithoutHyprnote {
                key,
                app,
                duration_secs,
            },
        );
    })
}
