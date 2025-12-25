use std::sync::Arc;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{Duration, Instant};
use tauri::{AppHandle, EventTarget, Manager, Runtime};
use tauri_plugin_windows::WindowImpl;
use tauri_specta::Event;

use crate::{DetectEvent, SharedState, dnd};

#[derive(Clone)]
enum MicDetectionState {
    Inactive,
    PendingStart {
        started_at: Instant,
        accumulated_apps: Vec<hypr_detect::InstalledApp>,
        generation: u64,
    },
    Active {
        current_apps: Vec<hypr_detect::InstalledApp>,
        generation: u64,
    },
    PendingStop {
        stopped_at: Instant,
        last_apps: Vec<hypr_detect::InstalledApp>,
        generation: u64,
    },
}

impl Default for MicDetectionState {
    fn default() -> Self {
        Self::Inactive
    }
}

pub(crate) fn default_ignored_bundle_ids() -> Vec<String> {
    let hyprnote = [
        "com.hyprnote.dev",
        "com.hyprnote.stable",
        "com.hyprnote.nightly",
        "com.hyprnote.staging",
    ];

    let dictation_apps = [
        "com.electron.wispr-flow",
        "com.seewillow.WillowMac",
        "com.superduper.superwhisper",
        "com.prakashjoshipax.VoiceInk",
        "com.goodsnooze.macwhisper",
        "com.descript.beachcube",
        "com.apple.VoiceMemos",
        "com.electron.aqua-voice",
    ];

    let ides = [
        "dev.warp.Warp-Stable",
        "com.exafunction.windsurf",
        "com.microsoft.VSCode",
        "com.todesktop.230313mzl4w4u92",
    ];

    let screen_recording = [
        "so.cap.desktop",
        "com.timpler.screenstudio",
        "com.loom.desktop",
        "com.obsproject.obs-studio",
    ];

    let ai_assistants = ["com.openai.chat", "com.anthropic.claudefordesktop"];

    let other = ["com.raycast.macos", "com.apple.garageband10"];

    dictation_apps
        .into_iter()
        .chain(hyprnote)
        .chain(ides)
        .chain(screen_recording)
        .chain(ai_assistants)
        .chain(other)
        .map(String::from)
        .collect()
}

struct MicStateMachine<R: Runtime> {
    app_handle: AppHandle<R>,
    state: Arc<tokio::sync::Mutex<MicDetectionState>>,
    generation: Arc<AtomicU64>,
}

impl<R: Runtime> MicStateMachine<R> {
    fn new(app_handle: AppHandle<R>) -> Self {
        Self {
            app_handle,
            state: Arc::new(tokio::sync::Mutex::new(MicDetectionState::Inactive)),
            generation: Arc::new(AtomicU64::new(0)),
        }
    }

    async fn handle_raw_mic_started(&self, apps: Vec<hypr_detect::InstalledApp>) {
        let shared_state = self.app_handle.state::<SharedState>();
        let state_guard = shared_state.lock().await;

        if state_guard.respect_do_not_disturb && dnd::is_do_not_disturb() {
            tracing::info!(reason = "respect_do_not_disturb", "skip_mic_started");
            drop(state_guard);
            return;
        }

        let filtered_apps = filter_apps(apps, &state_guard.ignored_bundle_ids);
        let confirmation_delay_ms = state_guard.mic_detection_delay_ms;
        drop(state_guard);

        if filtered_apps.is_empty() {
            tracing::info!(reason = "all_apps_filtered", "skip_mic_started");
            return;
        }

        let mut state = self.state.lock().await;
        match &*state {
            MicDetectionState::Inactive => {
                let generation = self.generation.fetch_add(1, Ordering::SeqCst) + 1;
                tracing::info!(
                    generation,
                    delay_ms = confirmation_delay_ms,
                    "entering_pending_start"
                );
                *state = MicDetectionState::PendingStart {
                    started_at: Instant::now(),
                    accumulated_apps: filtered_apps.clone(),
                    generation,
                };
                drop(state);

                self.schedule_confirmation_timer(filtered_apps, confirmation_delay_ms, generation)
                    .await;
            }
            MicDetectionState::PendingStart {
                started_at,
                accumulated_apps: _,
                generation,
            } => {
                tracing::info!(generation = generation, "updating_pending_start_apps");
                *state = MicDetectionState::PendingStart {
                    started_at: *started_at,
                    accumulated_apps: filtered_apps,
                    generation: *generation,
                };
            }
            MicDetectionState::Active {
                current_apps: _,
                generation,
            } => {
                tracing::info!(
                    generation = generation,
                    "mic_started_while_active_updating_apps"
                );
                *state = MicDetectionState::Active {
                    current_apps: filtered_apps,
                    generation: *generation,
                };
            }
            MicDetectionState::PendingStop {
                stopped_at: _,
                last_apps: _,
                generation,
            } => {
                let current_gen = *generation;
                tracing::info!(
                    generation = current_gen,
                    "mic_restarted_during_grace_staying_active"
                );
                *state = MicDetectionState::Active {
                    current_apps: filtered_apps,
                    generation: current_gen,
                };
            }
        }
    }

    async fn handle_raw_mic_stopped(&self, apps: Vec<hypr_detect::InstalledApp>) {
        let shared_state = self.app_handle.state::<SharedState>();
        let state_guard = shared_state.lock().await;

        if state_guard.respect_do_not_disturb && dnd::is_do_not_disturb() {
            tracing::info!(reason = "respect_do_not_disturb", "skip_mic_stopped");
            drop(state_guard);
            return;
        }

        let filtered_apps = filter_apps(apps, &state_guard.ignored_bundle_ids);
        let stop_grace_ms = state_guard.mic_stop_grace_ms;
        drop(state_guard);

        if filtered_apps.is_empty() {
            tracing::info!(reason = "all_apps_filtered", "skip_mic_stopped");
            return;
        }

        let mut state = self.state.lock().await;
        match &*state {
            MicDetectionState::Inactive => {
                tracing::debug!("mic_stopped_while_inactive_ignoring");
            }
            MicDetectionState::PendingStart { generation, .. } => {
                let current_gen = *generation;
                tracing::info!(
                    generation = current_gen,
                    "mic_stopped_during_pending_start_returning_to_inactive"
                );
                *state = MicDetectionState::Inactive;
            }
            MicDetectionState::Active {
                current_apps,
                generation,
            } => {
                let current_gen = *generation;
                let apps_to_stop = current_apps.clone();
                tracing::info!(
                    generation = current_gen,
                    grace_ms = stop_grace_ms,
                    "entering_pending_stop"
                );
                *state = MicDetectionState::PendingStop {
                    stopped_at: Instant::now(),
                    last_apps: apps_to_stop.clone(),
                    generation: current_gen,
                };
                drop(state);

                self.schedule_stop_timer(apps_to_stop, stop_grace_ms, current_gen)
                    .await;
            }
            MicDetectionState::PendingStop { generation, .. } => {
                tracing::debug!(
                    generation = generation,
                    "mic_stopped_while_already_pending_stop"
                );
            }
        }
    }

    async fn schedule_confirmation_timer(
        &self,
        _apps: Vec<hypr_detect::InstalledApp>,
        delay_ms: u64,
        generation: u64,
    ) {
        let state_clone = self.state.clone();
        let app_handle_for_state = self.app_handle.clone();
        let app_handle = self.app_handle.clone();

        tokio::spawn(async move {
            tokio::time::sleep(Duration::from_millis(delay_ms)).await;

            let mut state = state_clone.lock().await;
            match &*state {
                MicDetectionState::PendingStart {
                    generation: current_gen,
                    accumulated_apps,
                    ..
                } if *current_gen == generation => {
                    let shared_state = app_handle_for_state.state::<SharedState>();
                    let state_guard = shared_state.lock().await;
                    let filtered_apps =
                        filter_apps(accumulated_apps.clone(), &state_guard.ignored_bundle_ids);
                    drop(state_guard);

                    if !filtered_apps.is_empty() {
                        tracing::info!(generation, "confirmation_timer_fired_emitting_mic_started");
                        *state = MicDetectionState::Active {
                            current_apps: filtered_apps.clone(),
                            generation,
                        };
                        drop(state);

                        emit_to_main(
                            &app_handle,
                            DetectEvent::MicStarted {
                                key: uuid::Uuid::new_v4().to_string(),
                                apps: filtered_apps,
                            },
                        );
                    } else {
                        tracing::info!(
                            generation,
                            "confirmation_timer_fired_but_no_apps_after_filter"
                        );
                        *state = MicDetectionState::Inactive;
                    }
                }
                _ => {
                    tracing::debug!(
                        generation,
                        "confirmation_timer_fired_but_state_changed_ignoring"
                    );
                }
            }
        });
    }

    async fn schedule_stop_timer(
        &self,
        _apps: Vec<hypr_detect::InstalledApp>,
        grace_ms: u64,
        generation: u64,
    ) {
        let state_clone = self.state.clone();
        let app_handle = self.app_handle.clone();

        tokio::spawn(async move {
            tokio::time::sleep(Duration::from_millis(grace_ms)).await;

            let mut state = state_clone.lock().await;
            let apps_to_emit = match &*state {
                MicDetectionState::PendingStop {
                    generation: current_gen,
                    last_apps,
                    ..
                } if *current_gen == generation => {
                    tracing::info!(generation, "stop_timer_fired_emitting_mic_stopped");
                    let apps = last_apps.clone();
                    *state = MicDetectionState::Inactive;
                    Some(apps)
                }
                _ => {
                    tracing::debug!(generation, "stop_timer_fired_but_state_changed_ignoring");
                    None
                }
            };
            drop(state);

            if let Some(apps) = apps_to_emit {
                emit_to_main(&app_handle, DetectEvent::MicStopped { apps });
            }
        });
    }
}

pub async fn setup<R: Runtime>(app: &AppHandle<R>) -> Result<(), Box<dyn std::error::Error>> {
    let state_machine = Arc::new(MicStateMachine::new(app.app_handle().clone()));
    let state_machine_clone = state_machine.clone();
    let app_handle = app.app_handle().clone();

    let callback = hypr_detect::new_callback(move |event| {
        let state_machine = state_machine_clone.clone();
        #[cfg(target_os = "macos")]
        let app_handle = app_handle.clone();

        match event {
            hypr_detect::DetectEvent::MicStarted(apps) => {
                tauri::async_runtime::spawn(async move {
                    state_machine.handle_raw_mic_started(apps).await;
                });
            }
            hypr_detect::DetectEvent::MicStopped(apps) => {
                tauri::async_runtime::spawn(async move {
                    state_machine.handle_raw_mic_stopped(apps).await;
                });
            }
            #[cfg(target_os = "macos")]
            hypr_detect::DetectEvent::ZoomMuteStateChanged { value } => {
                emit_to_main(&app_handle, DetectEvent::MicMuted { value });
            }
        }
    });

    let state = app.state::<SharedState>();
    let mut state_guard = state.lock().await;
    state_guard.detector.start(callback);
    drop(state_guard);

    Ok(())
}

fn filter_apps(
    apps: Vec<hypr_detect::InstalledApp>,
    ignored_bundle_ids: &[String],
) -> Vec<hypr_detect::InstalledApp> {
    let default_ignored = default_ignored_bundle_ids();
    apps.into_iter()
        .filter(|app| !ignored_bundle_ids.contains(&app.id))
        .filter(|app| !default_ignored.contains(&app.id))
        .collect()
}

fn emit_to_main<R: Runtime>(app_handle: &AppHandle<R>, event: DetectEvent) {
    let _ = event.emit_to(
        app_handle,
        EventTarget::AnyLabel {
            label: tauri_plugin_windows::AppWindow::Main.label(),
        },
    );
}
