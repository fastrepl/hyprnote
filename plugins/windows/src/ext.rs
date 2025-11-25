use tauri::{AppHandle, Manager, WebviewWindow};
use tauri_specta::Event;
use uuid::Uuid;

use crate::{events, AppWindow, WindowImpl};

impl AppWindow {
    fn emit_navigate(
        &self,
        app: &AppHandle<tauri::Wry>,
        event: events::Navigate,
    ) -> Result<(), crate::Error> {
        if self.get(app).is_some() {
            events::Navigate::emit_to(&event, app, self.label())?;
        }
        Ok(())
    }

    fn navigate(
        &self,
        app: &AppHandle<tauri::Wry>,
        path: impl AsRef<str>,
    ) -> Result<(), crate::Error> {
        if let Some(window) = self.get(app) {
            let mut url = window.url().unwrap();

            let path_str = path.as_ref();
            if let Some(query_index) = path_str.find('?') {
                let (path_part, query_part) = path_str.split_at(query_index);
                url.set_path(path_part);
                url.set_query(Some(&query_part[1..]));
            } else {
                url.set_path(path_str);
                url.set_query(None);
            }

            window.navigate(url)?;
        }

        Ok(())
    }

    pub fn get(&self, app: &AppHandle<tauri::Wry>) -> Option<WebviewWindow> {
        let label = self.label();
        app.get_webview_window(&label)
    }

    pub fn hide(&self, app: &AppHandle<tauri::Wry>) -> Result<(), crate::Error> {
        if let Some(window) = self.get(app) {
            window.hide()?;
        }

        Ok(())
    }

    fn close(&self, app: &AppHandle<tauri::Wry>) -> Result<(), crate::Error> {
        if let Some(window) = self.get(app) {
            window.close()?;
        }

        Ok(())
    }

    pub fn destroy(&self, app: &AppHandle<tauri::Wry>) -> Result<(), crate::Error> {
        if let Some(window) = self.get(app) {
            window.destroy()?;
        }

        Ok(())
    }

    pub fn show(&self, app: &AppHandle<tauri::Wry>) -> Result<WebviewWindow, crate::Error>
    where
        Self: WindowImpl,
    {
        #[cfg(target_os = "macos")]
        let _ = app.set_activation_policy(tauri::ActivationPolicy::Regular);

        if self.label() == "main" {
            use tauri_plugin_analytics::{AnalyticsPayload, AnalyticsPluginExt};

            let e = AnalyticsPayload::new("show_main_window").build();

            let app_clone = app.clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = app_clone.event(e).await {
                    tracing::error!("failed_to_send_analytics: {:?}", e);
                }
            });
        }

        if let Some(window) = self.get(app) {
            window.show()?;
            window.set_focus()?;
            return Ok(window);
        }

        let window = self.build_window(app)?;

        window.set_focus()?;
        window.show()?;

        if self.label() == "main" {
            if let Err(e) = app.handle_main_window_visibility(true) {
                tracing::error!("failed_to_handle_main_window_visibility: {:?}", e);
            }
        }

        Ok(window)
    }
}

pub trait WindowsPluginExt<R: tauri::Runtime> {
    fn close_all_windows(&self) -> Result<(), crate::Error>;
    fn handle_main_window_visibility(&self, visible: bool) -> Result<(), crate::Error>;

    fn window_show(&self, window: AppWindow) -> Result<WebviewWindow, crate::Error>;
    fn window_hide(&self, window: AppWindow) -> Result<(), crate::Error>;
    fn window_close(&self, window: AppWindow) -> Result<(), crate::Error>;
    fn window_destroy(&self, window: AppWindow) -> Result<(), crate::Error>;
    fn window_is_focused(&self, window: AppWindow) -> Result<bool, crate::Error>;
    fn window_is_exists(&self, window: AppWindow) -> Result<bool, crate::Error>;

    fn window_emit_navigate(
        &self,
        window: AppWindow,
        event: events::Navigate,
    ) -> Result<(), crate::Error>;

    fn window_navigate(&self, window: AppWindow, path: impl AsRef<str>)
        -> Result<(), crate::Error>;
}

impl WindowsPluginExt<tauri::Wry> for AppHandle<tauri::Wry> {
    fn close_all_windows(&self) -> Result<(), crate::Error> {
        for (_, window) in self.webview_windows() {
            let _ = window.close();
        }
        Ok(())
    }

    fn handle_main_window_visibility(&self, visible: bool) -> Result<(), crate::Error> {
        let state = self.state::<crate::ManagedState>();
        let mut guard = state.lock().unwrap();

        let window_state = guard.windows.entry(AppWindow::Main).or_default();

        if window_state.visible != visible {
            let previous_visible = window_state.visible;
            window_state.visible = visible;

            let event_name = if visible {
                "show_main_window"
            } else {
                "hide_main_window"
            };

            let session_id = if !previous_visible && visible {
                let new_session_id = Uuid::new_v4().to_string();
                window_state.id = new_session_id.clone();
                new_session_id
            } else {
                window_state.id.clone()
            };

            let user_id = {
                use tauri_plugin_auth::{AuthPluginExt, StoreKey};

                self.get_from_store(StoreKey::UserId)?
                    .unwrap_or("UNKNOWN".into())
            };

            {
                use tauri_plugin_analytics::{AnalyticsPayload, AnalyticsPluginExt};

                let e = AnalyticsPayload::new(event_name)
                    .with("user_id", user_id)
                    .with("session_id", session_id)
                    .build();

                let app_clone = self.clone();
                tauri::async_runtime::spawn(async move {
                    if let Err(e) = app_clone.event(e).await {
                        tracing::error!("failed_to_send_analytics: {:?}", e);
                    }
                });
            }
        }

        Ok(())
    }

    fn window_show(&self, window: AppWindow) -> Result<WebviewWindow, crate::Error> {
        window.show(self)
    }

    fn window_close(&self, window: AppWindow) -> Result<(), crate::Error> {
        window.close(self)
    }

    fn window_hide(&self, window: AppWindow) -> Result<(), crate::Error> {
        window.hide(self)
    }

    fn window_destroy(&self, window: AppWindow) -> Result<(), crate::Error> {
        window.destroy(self)
    }

    fn window_is_focused(&self, window: AppWindow) -> Result<bool, crate::Error> {
        Ok(window
            .get(self)
            .and_then(|w| w.is_focused().ok())
            .unwrap_or(false))
    }

    fn window_emit_navigate(
        &self,
        window: AppWindow,
        event: events::Navigate,
    ) -> Result<(), crate::Error> {
        window.emit_navigate(self, event)
    }

    fn window_navigate(
        &self,
        window: AppWindow,
        path: impl AsRef<str>,
    ) -> Result<(), crate::Error> {
        window.navigate(self, path)
    }

    fn window_is_exists(&self, window: AppWindow) -> Result<bool, crate::Error> {
        Ok(window.get(self).is_some())
    }
}
