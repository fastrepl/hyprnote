use std::cell::RefCell;
use std::sync::Mutex;
use std::time::Duration;

use gtk::prelude::*;
use gtk::{
    Align, Box as GtkBox, Button, CssProvider, Image, Label, Orientation, StyleContext, Window,
    WindowType,
};
use indexmap::IndexMap;

thread_local! {
    static NOTIFICATION_MANAGER: RefCell<NotificationManager> = RefCell::new(NotificationManager::new());
}

static CONFIRM_CB: Mutex<Option<Box<dyn Fn(String) + Send + Sync>>> = Mutex::new(None);
static DISMISS_CB: Mutex<Option<Box<dyn Fn(String) + Send + Sync>>> = Mutex::new(None);

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

fn call_confirm_handler(id: String) {
    if let Some(cb) = CONFIRM_CB.lock().unwrap().as_ref() {
        cb(id);
    }
}

fn call_dismiss_handler(id: String) {
    if let Some(cb) = DISMISS_CB.lock().unwrap().as_ref() {
        cb(id);
    }
}

struct NotificationInstance {
    id: String,
    window: Window,
    timeout_source: Option<glib::SourceId>,
}

impl NotificationInstance {
    fn new(window: Window, id: String) -> Self {
        Self {
            id,
            window,
            timeout_source: None,
        }
    }

    fn start_dismiss_timer(&mut self, timeout_seconds: f64) {
        if let Some(source) = self.timeout_source.take() {
            source.remove();
        }

        let id = self.id.clone();
        let window = self.window.clone();
        let source = glib::timeout_add_seconds_local_once(timeout_seconds as u32, move || {
            Self::dismiss_window(&window, &id, false);
        });
        self.timeout_source = Some(source);
    }

    fn dismiss_window_inner(window: &Window, id: &str, user_action: bool) {
        if user_action {
            call_dismiss_handler(id.to_string());
        }

        window.set_opacity(1.0);
        let window_clone = window.clone();
        glib::timeout_add_local_once(Duration::from_millis(200), move || {
            window_clone.close();
        });
    }

    fn dismiss_window(window: &Window, id: &str, user_action: bool) {
        Self::dismiss_window_inner(window, id, user_action);
        NotificationManager::remove_notification_global(id);
    }
}

struct NotificationManager {
    active_notifications: IndexMap<String, NotificationInstance>,
    max_notifications: usize,
    notification_spacing: i32,
}

impl NotificationManager {
    fn new() -> Self {
        Self {
            active_notifications: IndexMap::new(),
            max_notifications: 5,
            notification_spacing: 10,
        }
    }

    fn ensure_gtk(&self) {
        let _ = gtk::init();
    }

    fn show(&mut self, title: String, message: String, url: Option<String>, timeout_seconds: f64) {
        self.ensure_gtk();

        while self.active_notifications.len() >= self.max_notifications {
            if let Some((oldest_id, notif)) = self.active_notifications.get_index(0) {
                let oldest_id = oldest_id.clone();
                let window = notif.window.clone();
                NotificationInstance::dismiss_window_inner(&window, &oldest_id, false);
                self.remove_notification_locked(&oldest_id);
            } else {
                break;
            }
        }

        let id = uuid::Uuid::new_v4().to_string();

        let window = Window::new(WindowType::Toplevel);
        window.set_decorated(false);
        window.set_resizable(false);
        window.set_default_size(360, 64);
        window.set_keep_above(true);

        self.setup_window_style(&window);
        self.create_notification_content(&window, &title, &message, url.as_deref(), &id);
        self.position_window(&window);

        window.show_all();

        let mut notif = NotificationInstance::new(window, id.clone());
        notif.start_dismiss_timer(timeout_seconds);
        self.active_notifications.insert(id, notif);

        self.reposition_notifications();
    }

    fn setup_window_style(&self, _window: &Window) {
        let css_provider = CssProvider::new();
        let _ = css_provider.load_from_data(
            br#"
            window {
                background-color: rgba(255, 255, 255, 0.95);
                border-radius: 11px;
                border: 1px solid rgba(0, 0, 0, 0.1);
                box-shadow: 0 2px 12px rgba(0, 0, 0, 0.22);
            }
            .notification-title {
                font-size: 14px;
                font-weight: bold;
                color: #000000;
            }
            .notification-message {
                font-size: 11px;
                color: #666666;
            }
            .close-button {
                min-width: 15px;
                min-height: 15px;
                border-radius: 7.5px;
                background-color: rgba(0, 0, 0, 0.5);
                border: 0.5px solid rgba(0, 0, 0, 0.3);
                color: white;
                padding: 0;
                margin: 5px;
            }
            .close-button:hover {
                background-color: rgba(0, 0, 0, 0.6);
            }
            .action-button {
                border-radius: 10px;
                background-color: rgba(242, 242, 242, 0.9);
                border: 0.5px solid rgba(179, 179, 179, 0.5);
                color: rgba(26, 26, 26, 1.0);
                font-size: 14px;
                font-weight: 600;
                padding: 6px 11px;
                min-height: 28px;
            }
            .action-button:hover {
                background-color: rgba(230, 230, 230, 0.9);
            }
            "#,
        );

        if let Some(screen) = gdk::Screen::default() {
            StyleContext::add_provider_for_screen(
                &screen,
                &css_provider,
                gtk::STYLE_PROVIDER_PRIORITY_APPLICATION,
            );
        }
    }

    fn create_notification_content(
        &self,
        window: &Window,
        title: &str,
        message: &str,
        url: Option<&str>,
        id: &str,
    ) {
        let main_box = GtkBox::new(Orientation::Horizontal, 8);
        main_box.set_margin_start(12);
        main_box.set_margin_end(12);
        main_box.set_margin_top(9);
        main_box.set_margin_bottom(9);
        main_box.set_valign(Align::Center);

        let icon = Image::from_icon_name(Some("application-x-executable"), gtk::IconSize::Dnd);
        main_box.pack_start(&icon, false, false, 0);

        let text_box = GtkBox::new(Orientation::Vertical, 2);
        text_box.set_hexpand(true);

        let title_label = Label::new(Some(title));
        title_label.set_halign(Align::Start);
        title_label.set_ellipsize(pango::EllipsizeMode::End);
        title_label.style_context().add_class("notification-title");
        text_box.pack_start(&title_label, false, false, 0);

        let message_label = Label::new(Some(message));
        message_label.set_halign(Align::Start);
        message_label.set_ellipsize(pango::EllipsizeMode::End);
        message_label
            .style_context()
            .add_class("notification-message");
        text_box.pack_start(&message_label, false, false, 0);

        main_box.pack_start(&text_box, true, true, 0);

        if let Some(url_str) = url {
            if !url_str.is_empty() {
                let action_button = Button::with_label("Take Notes");
                action_button.style_context().add_class("action-button");

                let id_clone = id.to_string();
                let url_clone = url_str.to_string();
                let window_clone = window.clone();
                action_button.connect_clicked(move |_| {
                    call_confirm_handler(id_clone.clone());
                    let _ = open::that(&url_clone);
                    NotificationInstance::dismiss_window(&window_clone, &id_clone, false);
                });

                main_box.pack_start(&action_button, false, false, 0);
            }
        }

        let close_button = Button::new();
        close_button.set_label("×");
        close_button.style_context().add_class("close-button");
        close_button.set_valign(Align::Start);
        close_button.set_halign(Align::End);

        let id_clone = id.to_string();
        let window_clone = window.clone();
        close_button.connect_clicked(move |_| {
            NotificationInstance::dismiss_window(&window_clone, &id_clone, true);
        });

        let overlay = gtk::Overlay::new();
        overlay.add(&main_box);
        overlay.add_overlay(&close_button);

        window.add(&overlay);
    }

    fn position_window(&self, window: &Window) {
        // Position the window in the top-right corner of the screen
        if let Some(screen) = gdk::Screen::default() {
            let screen_width = screen.width();
            let (window_width, _) = window.size();
            let x = screen_width - window_width - 20;
            let y = 50;
            window.move_(x, y);
        }
    }

    fn reposition_notifications(&mut self) {
        // TODO: Reposition existing notifications once we implement a GTK4-compatible positioning strategy.
    }

    fn remove_notification_locked(&mut self, id: &str) {
        self.active_notifications.swap_remove(id);
        self.reposition_notifications();
    }

    fn remove_notification_global(id: &str) {
        NOTIFICATION_MANAGER.with(|manager| {
            manager.borrow_mut().remove_notification_locked(id);
        });
    }

    fn dismiss_all(&mut self) {
        let ids: Vec<String> = self.active_notifications.keys().cloned().collect();
        for id in ids {
            if let Some(notif) = self.active_notifications.get(&id) {
                let window = notif.window.clone();
                NotificationInstance::dismiss_window_inner(&window, &id, false);
                self.remove_notification_locked(&id);
            }
        }
    }
}

pub fn show(notification: &hypr_notification_interface::Notification) {
    let title = notification.title.clone();
    let message = notification.message.clone();
    let url = notification.url.clone();
    let timeout_seconds = notification.timeout.map(|d| d.as_secs_f64()).unwrap_or(5.0);

    glib::MainContext::default().invoke(move || {
        NOTIFICATION_MANAGER.with(|manager| {
            manager
                .borrow_mut()
                .show(title, message, url, timeout_seconds);
        });
    });
}

pub fn dismiss_all() {
    glib::MainContext::default().invoke(|| {
        NOTIFICATION_MANAGER.with(|manager| {
            manager.borrow_mut().dismiss_all();
        });
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_notification() {
        let notification = hypr_notification_interface::Notification::builder()
            .title("Test Title")
            .message("Test message content")
            .url("https://example.com")
            .timeout(std::time::Duration::from_secs(3))
            .build();

        show(&notification);
    }
}
