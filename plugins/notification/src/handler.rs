use tauri_plugin_analytics::{AnalyticsPayload, AnalyticsPluginExt};
use tauri_plugin_windows::WindowsPluginExt;
use tauri_specta::Event;

use crate::events::NotificationEvent;

pub fn init(app: tauri::AppHandle<tauri::Wry>) {
    {
        let app = app.clone();
        hypr_notification::setup_notification_confirm_handler(move |id| {
            if let Err(_e) = app.windows().show(tauri_plugin_windows::AppWindow::Main) {}

            let _ = NotificationEvent::Confirm { id }.emit(&app);

            app.analytics()
                .event_fire_and_forget(AnalyticsPayload::builder("notification_confirm").build());
        });
    }

    {
        let app = app.clone();
        hypr_notification::setup_notification_accept_handler(move |id| {
            if let Err(_e) = app.windows().show(tauri_plugin_windows::AppWindow::Main) {}

            let _ = NotificationEvent::Accept { id }.emit(&app);

            app.analytics()
                .event_fire_and_forget(AnalyticsPayload::builder("notification_accept").build());
        });
    }

    {
        let app = app.clone();
        hypr_notification::setup_notification_dismiss_handler(move |id| {
            let _ = NotificationEvent::Dismiss { id }.emit(&app);

            app.analytics()
                .event_fire_and_forget(AnalyticsPayload::builder("notification_dismiss").build());
        });
    }

    {
        let app = app.clone();
        hypr_notification::setup_notification_timeout_handler(move |id| {
            let _ = NotificationEvent::Timeout { id }.emit(&app);

            app.analytics()
                .event_fire_and_forget(AnalyticsPayload::builder("notification_timeout").build());
        });
    }
}
