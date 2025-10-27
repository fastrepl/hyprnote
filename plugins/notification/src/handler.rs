use std::sync::mpsc::{Receiver, Sender};
use std::sync::{Arc, RwLock};
use std::thread::JoinHandle;

use tauri::AppHandle;
use tauri_plugin_windows::{AppWindow, WindowsPluginExt};

use crate::NotificationConfig;

#[derive(Debug, Clone)]
pub enum NotificationTrigger {
    Detect(NotificationTriggerDetect),
    Event(NotificationTriggerEvent),
}

#[derive(Debug, Clone)]
pub struct NotificationTriggerDetect {
    pub event: hypr_detect::DetectEvent,
    pub timestamp: std::time::SystemTime,
}

#[derive(Debug, Clone)]
pub struct NotificationTriggerEvent {
    pub event_id: String,
    pub event_name: String,
    pub seconds_until_start: i64,
}

pub struct NotificationHandler {
    tx: Option<Sender<NotificationTrigger>>,
    handle: Option<JoinHandle<()>>,
    config: Arc<RwLock<NotificationConfig>>,
}

impl NotificationHandler {
    pub fn new(app_handle: AppHandle<tauri::Wry>, config: Arc<RwLock<NotificationConfig>>) -> Self {
        let (tx, rx) = std::sync::mpsc::channel::<NotificationTrigger>();
        let config_clone = config.clone();

        let handle = std::thread::spawn(move || {
            Self::worker_loop(rx, app_handle, config_clone);
        });

        Self {
            tx: Some(tx),
            handle: Some(handle),
            config,
        }
    }

    pub fn sender(&self) -> Option<Sender<NotificationTrigger>> {
        self.tx.clone()
    }

    fn worker_loop(
        rx: Receiver<NotificationTrigger>,
        app_handle: AppHandle<tauri::Wry>,
        config: Arc<RwLock<NotificationConfig>>,
    ) {
        while let Ok(trigger) = rx.recv() {
            match trigger {
                NotificationTrigger::Detect(t) => {
                    Self::handle_detect_event(&app_handle, t, &config);
                }
                NotificationTrigger::Event(e) => {
                    Self::handle_calendar_event(&app_handle, e, &config);
                }
            }
        }
    }

    fn handle_detect_event(
        app_handle: &AppHandle<tauri::Wry>,
        trigger: NotificationTriggerDetect,
        config: &Arc<RwLock<NotificationConfig>>,
    ) {
        let main_window_focused = app_handle
            .window_is_focused(AppWindow::Main)
            .unwrap_or(false);

        let respect_do_not_disturb = config.read().unwrap().respect_do_not_disturb;

        if main_window_focused {
            tracing::info!(reason = "main_window_focused", "skip_handle_detect_event");
            return;
        }

        match trigger.event {
            hypr_detect::DetectEvent::MicStarted(apps) => {
                if apps.is_empty() {
                    tracing::info!(reason = "apps.is_empty", "skip_notification");
                    return;
                }

                if apps.iter().any(|app| {
                    vec![
                        "com.electron.wispr-flow",
                        "com.seewillow.WillowMac",
                        "com.superduper.superwhisper",
                        "dev.warp.Warp-Stable",
                        "so.cap.desktop",
                        "com.timpler.screenstudio",
                        "com.loom.desktop",
                        "com.obsproject.obs-studio",
                        "com.prakashjoshipax.VoiceInk",
                        "com.goodsnooze.macwhisper",
                        "com.descript.beachcube",
                        "com.openai.chat",
                        "com.anthropic.claudefordesktop",
                        "com.raycast.macos",
                        "com.apple.VoiceMemos",
                        "com.exafunction.windsurf",
                        "dev.zed.Zed",
                        "com.microsoft.VSCode",
                        "com.todesktop.230313mzl4w4u92",
                        "com.apple.garageband10",
                    ]
                    .contains(&app.id.as_str())
                }) {
                    tracing::info!(reason = "ignore_platforms_default", "skip_notification");
                    return;
                }

                if apps
                    .iter()
                    .any(|app| config.read().unwrap().ignored_platforms.contains(&app.name))
                {
                    tracing::info!(reason = "ignore_platforms_user", "skip_notification");
                    return;
                }

                if respect_do_not_disturb && hypr_notification::is_do_not_disturb() {
                    tracing::info!(reason = "respect_do_not_disturb", "skip_notification");
                    return;
                }

                let timestamp_secs = trigger
                    .timestamp
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or(std::time::Duration::from_secs(0))
                    .as_secs();
                let window_key = timestamp_secs / 10;
                let key = format!("mic-detection-{}", window_key);

                hypr_notification::show(
                    &hypr_notification::Notification::builder()
                        .title("Meeting detected")
                        .key(key)
                        .message("Based on your microphone activity")
                        .url("hypr://hyprnote.com/app/new?record=true")
                        .timeout(std::time::Duration::from_secs(5))
                        .build(),
                );
            }
            hypr_detect::DetectEvent::MicStopped => {
                use tauri_plugin_listener::ListenerPluginExt;

                let app_handle = app_handle.clone();
                tauri::async_runtime::spawn(async move {
                    app_handle.stop_session().await;
                });
            }
        }
    }

    fn handle_calendar_event(
        app_handle: &AppHandle<tauri::Wry>,
        trigger: NotificationTriggerEvent,
        config: &Arc<RwLock<NotificationConfig>>,
    ) {
        let main_window_focused = app_handle
            .window_is_focused(AppWindow::Main)
            .unwrap_or(false);

        let respect_do_not_disturb = config.read().unwrap().respect_do_not_disturb;

        if main_window_focused {
            tracing::info!(reason = "main_window_focused", "handle_calendar_event");
            return;
        }

        if respect_do_not_disturb && hypr_notification::is_do_not_disturb() {
            tracing::info!(reason = "respect_do_not_disturb", "skip_notification");
            return;
        }

        if trigger.seconds_until_start < 180 {
            if let Err(e) = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                hypr_notification::show(
                    &hypr_notification::Notification::builder()
                        .key(&format!("event_{}", trigger.event_id,))
                        .title(trigger.event_name.clone())
                        .message("Meeting starting soon!")
                        .url(format!(
                            "hypr://hyprnote.com/app/new?calendarEventId={}&record=true",
                            trigger.event_id
                        ))
                        .timeout(std::time::Duration::from_secs(
                            trigger.seconds_until_start as u64,
                        ))
                        .build(),
                );
            })) {
                tracing::error!("{:?}", e);
            }
        }
    }

    pub fn stop(&mut self) {
        self.tx = None;

        if let Some(handle) = self.handle.take() {
            let _ = handle.join();
        }
    }
}

impl Drop for NotificationHandler {
    fn drop(&mut self) {
        self.stop();
    }
}
