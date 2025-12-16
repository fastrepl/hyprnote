mod constants;
mod event;
mod toast;

use std::sync::Mutex;

use gpui::{App, AppContext, Entity, WindowHandle, WindowId};

pub use gpui::PlatformDisplay;
pub use hypr_notification_interface::*;

pub use event::NotificationEvent;
pub use toast::{NotificationTheme, StatusToast};

static ACTIVE_WINDOWS: Mutex<Vec<WindowHandle<StatusToast>>> = Mutex::new(Vec::new());

fn close_window(cx: &mut App, window_id: WindowId) {
    let mut windows = ACTIVE_WINDOWS.lock().unwrap();
    windows.retain(|w| {
        if w.window_id() == window_id {
            w.update(cx, |_, window, _cx| {
                window.remove_window();
            })
            .ok();
            false
        } else {
            true
        }
    });
}

pub fn show(notification: &Notification, cx: &mut App) {
    let screen = match cx.primary_display() {
        Some(screen) => screen,
        None => return,
    };

    let toast_entity: Entity<StatusToast> = cx.new(|_cx| {
        let mut toast = StatusToast::new(&notification.title, &notification.message);
        if notification.url.is_some() {
            toast = toast.action_label("Open");
        }
        toast
    });

    if let Ok(window) = cx.open_window(StatusToast::window_options(screen, cx), |_window, _cx| {
        toast_entity.clone()
    }) {
        let window_id = window.window_id();

        cx.subscribe(
            &toast_entity,
            move |_, event: &NotificationEvent, cx| match event {
                NotificationEvent::Accepted | NotificationEvent::Dismissed => {
                    close_window(cx, window_id);
                }
            },
        )
        .detach();

        ACTIVE_WINDOWS.lock().unwrap().push(window);

        if let Some(timeout) = notification.timeout {
            cx.spawn(async move |cx| {
                cx.background_executor().timer(timeout).await;
                cx.update(|cx| {
                    close_window(cx, window_id);
                })
                .ok();
            })
            .detach();
        }
    }
}

pub fn dismiss_all(cx: &mut App) {
    let windows: Vec<_> = ACTIVE_WINDOWS.lock().unwrap().drain(..).collect();
    for window in windows {
        window
            .update(cx, |_, window, _cx| {
                window.remove_window();
            })
            .ok();
    }
}
