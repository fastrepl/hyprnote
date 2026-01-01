use tauri_plugin_analytics::{AnalyticsPayload, AnalyticsPluginExt};
use tauri_plugin_windows::WindowsPluginExt;
use tauri_specta::Event;

use crate::events::NotificationEvent;

pub fn init(app: tauri::AppHandle<tauri::Wry>) {
    {
        let app = app.clone();
        hypr_notification::setup_notification_confirm_handler(move |ctx| {
            app.analytics()
                .event_fire_and_forget(AnalyticsPayload::builder("notification_confirm").build());

            if let Err(_e) = app.windows().show(tauri_plugin_windows::AppWindow::Main) {}

            let event = NotificationEvent::Confirm {
                key: ctx.key,
                event_id: ctx.event_id,
            };

            if event.emit(&app).is_ok() {
                tracing::info!("notification_confirm_emitted");
            }
        });
    }

    {
        let app = app.clone();
        hypr_notification::setup_notification_accept_handler(move |ctx| {
            app.analytics()
                .event_fire_and_forget(AnalyticsPayload::builder("notification_accept").build());

            if let Err(_e) = app.windows().show(tauri_plugin_windows::AppWindow::Main) {}

            let event = NotificationEvent::Accept {
                key: ctx.key,
                event_id: ctx.event_id,
            };

            if event.emit(&app).is_ok() {
                tracing::info!("notification_accept_emitted");
            }
        });
    }

    {
        let app = app.clone();
        hypr_notification::setup_notification_dismiss_handler(move |ctx| {
            app.analytics()
                .event_fire_and_forget(AnalyticsPayload::builder("notification_dismiss").build());

            let event = NotificationEvent::Dismiss {
                key: ctx.key,
                event_id: ctx.event_id,
            };

            if event.emit(&app).is_ok() {
                tracing::info!("notification_dismiss_emitted");
            }
        });
    }

    {
        let app = app.clone();
        hypr_notification::setup_notification_timeout_handler(move |ctx| {
            app.analytics()
                .event_fire_and_forget(AnalyticsPayload::builder("notification_timeout").build());

            let event = NotificationEvent::Timeout {
                key: ctx.key,
                event_id: ctx.event_id,
            };

            if event.emit(&app).is_ok() {
                tracing::info!("notification_timeout_emitted");
            }
        });
    }
}
