use std::sync::mpsc::{Receiver, Sender};
use std::thread::JoinHandle;
use tauri::AppHandle;
use tauri_plugin_windows::{HyprWindow, WindowsPluginExt};

#[derive(Debug, Clone)]
pub enum NotificationTrigger {
    Detect(NotificationTriggerDetect),
    Event(NotificationTriggerEvent),
}

#[derive(Debug, Clone)]
pub struct NotificationTriggerDetect {
    pub event: hypr_detect::DetectEvent,
}

#[derive(Debug, Clone)]
pub struct NotificationTriggerEvent {
    pub event_id: String,
    pub event_name: String,
    pub minutes_until_start: i64,
}

pub struct NotificationHandler {
    tx: Option<Sender<NotificationTrigger>>,
    handle: Option<JoinHandle<()>>,
}

impl NotificationHandler {
    pub fn new(app_handle: AppHandle<tauri::Wry>) -> Self {
        let (tx, rx) = std::sync::mpsc::channel::<NotificationTrigger>();

        let handle = std::thread::spawn(move || {
            Self::worker_loop(rx, app_handle);
        });

        Self {
            tx: Some(tx),
            handle: Some(handle),
        }
    }

    pub fn sender(&self) -> Option<Sender<NotificationTrigger>> {
        self.tx.clone()
    }

    fn worker_loop(rx: Receiver<NotificationTrigger>, app_handle: AppHandle<tauri::Wry>) {
        while let Ok(trigger) = rx.recv() {
            match trigger {
                NotificationTrigger::Detect(t) => {
                    Self::handle_detect_event(&app_handle, t);
                }
                NotificationTrigger::Event(e) => {
                    Self::handle_calendar_event(&app_handle, e);
                }
            }
        }
    }

    fn handle_detect_event(app_handle: &AppHandle<tauri::Wry>, trigger: NotificationTriggerDetect) {
        let window_visible = app_handle
            .window_is_visible(HyprWindow::Main)
            .unwrap_or(false);

        match trigger.event {
            hypr_detect::DetectEvent::MicStarted => {
                if !window_visible {
                    hypr_notification::show(
                        &hypr_notification::Notification::builder()
                            .title("Meeting detected")
                            .message("Based on your microphone activity")
                            .url("hypr://hyprnote.com/app/new?record=true")
                            .timeout(std::time::Duration::from_secs(60))
                            .build(),
                    );
                }
            }
            hypr_detect::DetectEvent::MicStopped => {
                use tauri_plugin_listener::ListenerPluginExt;
                let app_handle = app_handle.clone();
                tokio::spawn(async move {
                    app_handle.pause_session().await;
                });
            }
            _ => {}
        }
    }

    fn handle_calendar_event(
        app_handle: &AppHandle<tauri::Wry>,
        trigger: NotificationTriggerEvent,
    ) {
        let window_visible = app_handle
            .window_is_visible(HyprWindow::Main)
            .unwrap_or(false);

        if !window_visible || trigger.minutes_until_start < 3 {
            if let Err(e) = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                hypr_notification::show(
                    &hypr_notification::Notification::builder()
                        .key(&format!(
                            "event_{}_{}",
                            trigger.event_id,
                            trigger.minutes_until_start < 3
                        ))
                        .title(trigger.event_name.clone())
                        .message(format!(
                            "Meeting starting in {} minutes",
                            if trigger.minutes_until_start < 3 {
                                1
                            } else {
                                trigger.minutes_until_start
                            }
                        ))
                        .url(format!(
                            "hypr://hyprnote.com/app/new?calendar_event_id={}",
                            trigger.event_id
                        ))
                        .timeout(std::time::Duration::from_secs(10))
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
