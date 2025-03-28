use tauri::Manager;
use tauri_specta::Event;

use crate::HyprWindow;

pub fn on_window_event<R: tauri::Runtime>(window: &tauri::Window<R>, event: &tauri::WindowEvent) {
    match event {
        tauri::WindowEvent::CloseRequested { api, .. } => {
            match window.label().parse::<HyprWindow>() {
                Err(e) => tracing::warn!("window_parse_error: {:?}", e),
                Ok(w) => {
                    println!("CloseRequested event received: {:?}", w);
                    if w == HyprWindow::Main && window.hide().is_ok() {
                        api.prevent_close();
                    }
                }
            }
        }
        tauri::WindowEvent::Destroyed { .. } => {
            let app = window.app_handle();
            let state = app.state::<crate::ManagedState>();

            match window.label().parse::<HyprWindow>() {
                Err(e) => tracing::warn!("window_parse_error: {:?}", e),
                Ok(w) => {
                    {
                        let mut guard = state.lock().unwrap();
                        guard.windows.remove(&w);
                    }

                    let event = WindowDestroyed { window: w };
                    let _ = event.emit(app);
                }
            }
        }
        _ => {}
    }
}

#[derive(serde::Serialize, Clone, specta::Type, tauri_specta::Event)]
pub struct Navigate {
    pub path: String,
}

#[derive(serde::Serialize, Clone, specta::Type, tauri_specta::Event)]
pub struct WindowDestroyed {
    pub window: HyprWindow,
}
