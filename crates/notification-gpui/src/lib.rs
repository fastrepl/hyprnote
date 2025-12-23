mod constants;
mod theme;
mod toast;

use std::sync::Mutex;

use gpui::{App, AppContext, Entity, WindowHandle, WindowId};

pub use gpui::PlatformDisplay;
pub use hypr_notification_interface::*;

pub use theme::NotificationTheme;
pub use toast::StatusToast;

static ACTIVE_WINDOWS: Mutex<Vec<WindowHandle<StatusToast>>> = Mutex::new(Vec::new());
static CONFIRM_CB: Mutex<Option<Box<dyn Fn(String) + Send + Sync>>> = Mutex::new(None);
static ACCEPT_CB: Mutex<Option<Box<dyn Fn(String) + Send + Sync>>> = Mutex::new(None);
static DISMISS_CB: Mutex<Option<Box<dyn Fn(String) + Send + Sync>>> = Mutex::new(None);
static TIMEOUT_CB: Mutex<Option<Box<dyn Fn(String) + Send + Sync>>> = Mutex::new(None);

pub fn setup_notification_dismiss_handler<F>(f: F)
where
    F: Fn(String) + Send + Sync + 'static,
{
    *DISMISS_CB.lock().unwrap() = Some(Box::new(f));
}

pub fn setup_notification_confirm_handler<F>(f: F)
where
    F: Fn(String) + Send + Sync + 'static,
{
    *CONFIRM_CB.lock().unwrap() = Some(Box::new(f));
}

pub fn setup_notification_accept_handler<F>(f: F)
where
    F: Fn(String) + Send + Sync + 'static,
{
    *ACCEPT_CB.lock().unwrap() = Some(Box::new(f));
}

pub fn setup_notification_timeout_handler<F>(f: F)
where
    F: Fn(String) + Send + Sync + 'static,
{
    *TIMEOUT_CB.lock().unwrap() = Some(Box::new(f));
}

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

    let toast_entity: Entity<StatusToast> =
        cx.new(|_cx| StatusToast::new(&notification.title, &notification.message));

    if let Ok(window) = cx.open_window(StatusToast::window_options(screen, cx), |_window, _cx| {
        toast_entity.clone()
    }) {
        let window_id = window.window_id();

        cx.subscribe(
            &toast_entity,
            move |_, event: &NotificationEvent, cx| match event {
                NotificationEvent::Accept
                | NotificationEvent::Dismiss
                | NotificationEvent::Confirm
                | NotificationEvent::Timeout => {
                    close_window(cx, window_id);
                }
            },
        )
        .detach();

        ACTIVE_WINDOWS.lock().unwrap().push(window);

        if let Some(timeout) = notification.timeout {
            let toast_entity = toast_entity.clone();
            cx.spawn(async move |cx| {
                cx.background_executor().timer(timeout).await;
                cx.update(|cx| {
                    toast_entity.update(cx, |_, cx| {
                        cx.emit(NotificationEvent::Timeout);
                    });
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
