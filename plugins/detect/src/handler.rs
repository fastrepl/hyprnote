use tauri::{AppHandle, EventTarget, Manager, Runtime};
use tauri_plugin_windows::WindowImpl;
use tauri_specta::Event;

use crate::{dnd, DetectEvent, SharedState};

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

                let filtered_apps: Vec<_> = apps
                    .into_iter()
                    .filter(|app| !state_guard.ignored_bundle_ids.contains(&app.id))
                    .filter(|app| !default_ignored_bundle_ids().contains(&app.id))
                    .collect();

                if filtered_apps.is_empty() {
                    tracing::info!(reason = "all_apps_filtered", "skip_notification");
                    return;
                }

                drop(state_guard);

                let detect_event = DetectEvent::MicStarted {
                    key: uuid::Uuid::new_v4().to_string(),
                    apps: filtered_apps,
                };
                let _ = detect_event.emit_to(
                    &app_handle,
                    EventTarget::AnyLabel {
                        label: tauri_plugin_windows::AppWindow::Main.label(),
                    },
                );
            }
            other_event => {
                let detect_event = DetectEvent::from(other_event);
                let _ = detect_event.emit_to(
                    &app_handle,
                    EventTarget::AnyLabel {
                        label: tauri_plugin_windows::AppWindow::Main.label(),
                    },
                );
            }
        }
    });

    let state = app.state::<SharedState>();
    let mut state_guard = state.lock().await;
    state_guard.detector.start(callback);
    drop(state_guard);

    Ok(())
}

pub(crate) fn default_ignored_bundle_ids() -> Vec<String> {
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
        "dev.zed.Zed",
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
        .chain(ides)
        .chain(screen_recording)
        .chain(ai_assistants)
        .chain(other)
        .map(String::from)
        .collect()
}
