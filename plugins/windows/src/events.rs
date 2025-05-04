use tauri::Manager;
use tauri_specta::Event;

use crate::HyprWindow;

pub fn on_window_event<R: tauri::Runtime>(window: &tauri::Window<R>, event: &tauri::WindowEvent) {
    match event {
        tauri::WindowEvent::CloseRequested { api, .. } => {
            match window.label().parse::<HyprWindow>() {
                Err(e) => tracing::warn!("window_parse_error: {:?}", e),
                Ok(w) => {
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

#[macro_export]
macro_rules! common_event_derives {
    ($item:item) => {
        #[derive(serde::Serialize, Clone, specta::Type, tauri_specta::Event)]
        $item
    };
}

common_event_derives! {
    pub struct Navigate {
        pub path: String,
    }
}

common_event_derives! {
    pub struct WindowDestroyed {
        pub window: HyprWindow,
    }
}

common_event_derives! {
    pub struct MainWindowState {
        pub left_sidebar_expanded: Option<bool>,
        pub right_panel_expanded: Option<bool>,
    }
}
