use tauri::{AppHandle, EventTarget, Manager, Runtime};
use tauri_plugin_windows::WindowImpl;
use tauri_specta::Event;

use crate::{DetectEvent, SharedState, dnd};

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

    let other = [
        "com.raycast.macos",
        "com.apple.garageband10",
        "com.apple.Sound-Settings.extension",
    ];

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

pub async fn setup<R: Runtime>(app: &AppHandle<R>) -> Result<(), Box<dyn std::error::Error>> {
    let app_handle = app.app_handle().clone();
    let callback = hypr_detect::new_callback(move |event| {
        let state = app_handle.state::<SharedState>();

        match event {
            hypr_detect::DetectEvent::MicStarted(apps) => {
                let state_guard = state.blocking_lock();

                if state_guard.respect_do_not_disturb && dnd::is_do_not_disturb() {
                    tracing::info!(reason = "respect_do_not_disturb", "skip_notification");
                    return;
                }

                let filtered_apps = filter_apps(apps, &state_guard.ignored_bundle_ids);
                drop(state_guard);

                if filtered_apps.is_empty() {
                    tracing::info!(reason = "all_apps_filtered", "skip_notification");
                    return;
                }

                emit_to_main(
                    &app_handle,
                    DetectEvent::MicStarted {
                        key: uuid::Uuid::new_v4().to_string(),
                        apps: filtered_apps,
                    },
                );
            }
            hypr_detect::DetectEvent::MicStopped(apps) => {
                let state_guard = state.blocking_lock();

                if state_guard.respect_do_not_disturb && dnd::is_do_not_disturb() {
                    tracing::info!(reason = "respect_do_not_disturb", "skip_mic_stopped");
                    return;
                }

                let filtered_apps = filter_apps(apps, &state_guard.ignored_bundle_ids);
                drop(state_guard);

                if filtered_apps.is_empty() {
                    tracing::info!(reason = "all_apps_filtered", "skip_mic_stopped");
                    return;
                }

                emit_to_main(
                    &app_handle,
                    DetectEvent::MicStopped {
                        apps: filtered_apps,
                    },
                );
            }
            #[cfg(all(target_os = "macos", feature = "display"))]
            hypr_detect::DetectEvent::DisplayChanged {
                foldable_display_active,
                external_connected,
            } => {
                emit_to_main(
                    &app_handle,
                    DetectEvent::DisplayChanged {
                        foldable_display_active,
                        external_connected,
                    },
                );
            }
            #[cfg(all(target_os = "macos", feature = "zoom"))]
            hypr_detect::DetectEvent::ZoomMuteStateChanged { value } => {
                emit_to_main(&app_handle, DetectEvent::MicMuteStateChanged { value });
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
