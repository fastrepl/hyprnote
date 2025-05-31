use tauri::Manager;
use tauri_specta::Event;

use crate::{HyprWindow, WindowsPluginExt};

pub fn on_window_event(window: &tauri::Window<tauri::Wry>, event: &tauri::WindowEvent) {
    let app = window.app_handle();

    match event {
        tauri::WindowEvent::CloseRequested { api, .. } => {
            match window.label().parse::<HyprWindow>() {
                Err(e) => tracing::warn!("window_parse_error: {:?}", e),
                Ok(w) => {
                    if w == HyprWindow::Main {
                        if window.hide().is_ok() {
                            api.prevent_close();

                            if let Err(e) = app.handle_main_window_visibility(false) {
                                tracing::error!("failed_to_handle_main_window_visibility: {:?}", e);
                            }
                        }
                    }
                }
            }
        }

        tauri::WindowEvent::Destroyed => {
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

                    if let Err(e) = app.handle_main_window_visibility(false) {
                        tracing::error!("failed_to_handle_main_window_visibility: {:?}", e);
                    }
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
