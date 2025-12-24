use tauri_plugin_analytics::{AnalyticsPayload, AnalyticsPluginExt};
use tauri_plugin_windows::WindowsPluginExt;
use tauri_specta::Event;

use crate::NotificationEvent;

pub fn init(app: tauri::AppHandle<tauri::Wry>) {
    {
        let app = app.clone();
        hypr_notification::setup_notification_confirm_handler(move |_id| {
            if let Err(_e) = app.windows().show(tauri_plugin_windows::AppWindow::Main) {}

            let _ = NotificationEvent::Confirm.emit(&app);

            let payload = AnalyticsPayload::builder("notification_confirm").build();
            app.analytics().event_fire_and_forget(payload);
        });
    }

    {
        let app = app.clone();
        hypr_notification::setup_notification_accept_handler(move |_id| {
            if let Err(_e) = app.windows().show(tauri_plugin_windows::AppWindow::Main) {}

            let payload = AnalyticsPayload::builder("notification_accept").build();
            app.analytics().event_fire_and_forget(payload);
        });
    }

    {
        let app = app.clone();
        hypr_notification::setup_notification_dismiss_handler(move |_id| {
            let payload = AnalyticsPayload::builder("notification_dismiss").build();
            app.analytics().event_fire_and_forget(payload);
        });
    }

    {
        let app = app.clone();
        hypr_notification::setup_notification_timeout_handler(move |_id| {
            let payload = AnalyticsPayload::builder("notification_timeout").build();
            app.analytics().event_fire_and_forget(payload);
        });
    }
}
