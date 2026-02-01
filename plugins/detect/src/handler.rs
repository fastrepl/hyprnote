use tauri::{AppHandle, EventTarget, Manager, Runtime};
use tauri_plugin_listener::ListenerPluginExt;
use tauri_plugin_windows::WindowImpl;
use tauri_specta::Event;

use crate::{
    DetectEvent, SharedState, dnd,
    policy::{MicEventType, PolicyContext},
};

pub async fn setup<R: Runtime>(app: &AppHandle<R>) -> Result<(), Box<dyn std::error::Error>> {
    let app_handle = app.app_handle().clone();
    let callback = hypr_detect::new_callback(move |event| {
        let app_handle_clone = app_handle.clone();

        match event {
            hypr_detect::DetectEvent::MicStarted(apps) => {
                tauri::async_runtime::spawn(async move {
                    handle_mic_started(&app_handle_clone, apps).await;
                });
            }
            hypr_detect::DetectEvent::MicStopped(apps) => {
                tauri::async_runtime::spawn(async move {
                    handle_mic_stopped(&app_handle_clone, apps).await;
                });
            }
            #[cfg(all(target_os = "macos", feature = "zoom"))]
            hypr_detect::DetectEvent::ZoomMuteStateChanged { value } => {
                emit_to_main(&app_handle, DetectEvent::MicMuteStateChanged { value });
            }
            #[cfg(all(target_os = "macos", feature = "sleep"))]
            hypr_detect::DetectEvent::SleepStateChanged { value } => {
                emit_to_main(&app_handle, DetectEvent::SleepStateChanged { value });
            }
        }
    });

    let state = app.state::<SharedState>();
    let mut state_guard = state.lock().await;
    state_guard.detector.start(callback);
    drop(state_guard);

    Ok(())
}

async fn handle_mic_started<R: Runtime>(
    app_handle: &AppHandle<R>,
    apps: Vec<hypr_detect::InstalledApp>,
) {
    let state = app_handle.state::<SharedState>();
    let state_guard = state.lock().await;

    let is_listening = {
        let listener_state = app_handle.listener().get_state().await;
        matches!(
            listener_state,
            tauri_plugin_listener::fsm::State::Active
                | tauri_plugin_listener::fsm::State::Finalizing
        )
    };

    let is_dnd = state_guard.policy.respect_dnd && dnd::is_do_not_disturb();

    let ctx = PolicyContext {
        apps: &apps,
        is_listening,
        is_dnd,
        event_type: MicEventType::Started,
    };

    match state_guard.policy.evaluate(&ctx) {
        Ok(result) => {
            drop(state_guard);
            emit_to_main(
                app_handle,
                DetectEvent::MicStarted {
                    key: result.dedup_key,
                    apps: result.filtered_apps,
                },
            );
        }
        Err(reason) => {
            tracing::info!(?reason, "skip_notification");
        }
    }
}

async fn handle_mic_stopped<R: Runtime>(
    app_handle: &AppHandle<R>,
    apps: Vec<hypr_detect::InstalledApp>,
) {
    let state = app_handle.state::<SharedState>();
    let state_guard = state.lock().await;

    let is_listening = {
        let listener_state = app_handle.listener().get_state().await;
        matches!(
            listener_state,
            tauri_plugin_listener::fsm::State::Active
                | tauri_plugin_listener::fsm::State::Finalizing
        )
    };

    let is_dnd = state_guard.policy.respect_dnd && dnd::is_do_not_disturb();

    let ctx = PolicyContext {
        apps: &apps,
        is_listening,
        is_dnd,
        event_type: MicEventType::Stopped,
    };

    match state_guard.policy.evaluate(&ctx) {
        Ok(result) => {
            drop(state_guard);
            emit_to_main(
                app_handle,
                DetectEvent::MicStopped {
                    apps: result.filtered_apps,
                },
            );
        }
        Err(reason) => {
            tracing::info!(?reason, "skip_mic_stopped");
        }
    }
}

fn emit_to_main<R: Runtime>(app_handle: &AppHandle<R>, event: DetectEvent) {
    let _ = event.emit_to(
        app_handle,
        EventTarget::AnyLabel {
            label: tauri_plugin_windows::AppWindow::Main.label(),
        },
    );
}
