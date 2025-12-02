use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;

use tauri::{AppHandle, EventTarget, Manager, Runtime};
use tauri_plugin_windows::WindowImpl;
use tauri_specta::Event;

use crate::NetworkEvent;

pub async fn setup<R: Runtime>(app: &AppHandle<R>) -> Result<(), Box<dyn std::error::Error>> {
    let app_handle = app.app_handle().clone();
    let initial_status = hypr_network::is_online().await;
    let last_status = Arc::new(AtomicBool::new(initial_status));

    tokio::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs(5));

        loop {
            interval.tick().await;

            let is_online = hypr_network::is_online().await;
            let previous = last_status.swap(is_online, Ordering::SeqCst);

            if is_online != previous {
                let event = NetworkEvent::StatusChanged { is_online };
                let _ = event.emit_to(
                    &app_handle,
                    EventTarget::AnyLabel {
                        label: tauri_plugin_windows::AppWindow::Main.label(),
                    },
                );
            }
        }
    });

    Ok(())
}
