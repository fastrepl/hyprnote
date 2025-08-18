use tauri::Manager;
use tauri_specta::Event;

use crate::{HyprWindow, WindowsPluginExt};

pub fn on_event(app: &tauri::AppHandle<tauri::Wry>, event: &tauri::RunEvent) {
    let tauri::RunEvent::WindowEvent { event, label, .. } = event else {
        return;
    };

    let hypr_window = match label.parse::<HyprWindow>() {
        Ok(window) => window,
        Err(e) => {
            tracing::warn!("window_parse_error: {:?}", e);
            return;
        }
    };

    let Some(webview_window) = hypr_window.get(app) else {
        return;
    };

    match event {
        tauri::WindowEvent::CloseRequested { api, .. } => match label.parse::<HyprWindow>() {
            Err(e) => tracing::warn!("window_parse_error: {:?}", e),
            Ok(w) => {
                if w == HyprWindow::Main {
                    if webview_window.hide().is_ok() {
                        api.prevent_close();

                        if let Err(e) = app.handle_main_window_visibility(false) {
                            tracing::error!("failed_to_handle_main_window_visibility: {:?}", e);
                        }
                    }
                }
            }
        },

        tauri::WindowEvent::Destroyed => {
            let state = app.state::<crate::ManagedState>();

            match label.parse::<HyprWindow>() {
                Err(e) => tracing::warn!("window_parse_error: {:?}", e),
                Ok(w) => {
                    {
                        let mut guard = state.lock().unwrap();
                        guard.windows.remove(&w);
                    }

                    let event = WindowDestroyed { window: w };
                    let _ = event.emit(&webview_window);

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
        #[derive(
            serde::Serialize, serde::Deserialize, Clone, specta::Type, tauri_specta::Event,
        )]
        $item
    };
}

common_event_derives! {
    pub struct Navigate {
        pub path: String,
        pub search: Option<serde_json::Map<String, serde_json::Value>>,
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
