use std::str::FromStr;

use tauri::Manager;
use tauri_specta::Event;

use crate::{HyprWindow, WindowsPluginExt};

// TODO: https://github.com/fastrepl/hyprnote/commit/150c8a1 this not worked. webview_window not found.
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

impl FromStr for Navigate {
    type Err = url::ParseError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let url = url::Url::parse(s)?;

        let path = url.path().to_string();

        let search: Option<serde_json::Map<String, serde_json::Value>> = {
            let pairs: Vec<_> = url.query_pairs().collect();
            if pairs.is_empty() {
                None
            } else {
                let map: serde_json::Map<String, serde_json::Value> = pairs
                    .into_iter()
                    .map(|(k, v)| (k.into_owned(), serde_json::Value::String(v.into_owned())))
                    .collect();
                Some(map)
            }
        };

        Ok(Navigate { path, search })
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

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn navigate_from_str() {
        let v: Navigate = "hypr://hyprnote.com/app/new?calendarEventId=123&record=true"
            .parse()
            .unwrap();

        assert_eq!(v.path, "/app/new");
        assert_eq!(
            v.search,
            Some(
                serde_json::json!({ "calendarEventId": "123", "record": "true" })
                    .as_object()
                    .cloned()
                    .unwrap()
            )
        );
    }
}
