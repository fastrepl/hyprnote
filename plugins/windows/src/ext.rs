use tauri::{AppHandle, Manager, WebviewWindow};
use tauri_specta::Event;

use crate::{AppWindow, WindowImpl, events};

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

        if matches!(self, Self::Main) {
            use tauri_plugin_analytics::{AnalyticsPayload, AnalyticsPluginExt};

            let e = AnalyticsPayload::builder("show_main_window").build();
            app.analytics().event_fire_and_forget(e);
        }

        if let Some(window) = self.get(app) {
            window.show()?;
            window.set_focus()?;
            return Ok(window);
        }

        let window = self.build_window(app)?;

        if matches!(self, Self::Main) {
            use tauri_plugin_window_state::{StateFlags, WindowExt};
            let _ = window.restore_state(StateFlags::SIZE);
        }

        window.show()?;
        window.set_focus()?;

        Ok(window)
    }
}

pub struct Windows<'a> {
    app: &'a AppHandle<tauri::Wry>,
}

impl<'a> Windows<'a> {
    pub fn show(&self, window: AppWindow) -> Result<WebviewWindow, crate::Error> {
        window.show(self.app)
    }

    pub fn hide(&self, window: AppWindow) -> Result<(), crate::Error> {
        window.hide(self.app)
    }

    pub fn close(&self, window: AppWindow) -> Result<(), crate::Error> {
        window.close(self.app)
    }

    pub fn destroy(&self, window: AppWindow) -> Result<(), crate::Error> {
        window.destroy(self.app)
    }

    pub fn is_focused(&self, window: AppWindow) -> Result<bool, crate::Error> {
        Ok(window
            .get(self.app)
            .and_then(|w| w.is_focused().ok())
            .unwrap_or(false))
    }

    pub fn is_exists(&self, window: AppWindow) -> Result<bool, crate::Error> {
        Ok(window.get(self.app).is_some())
    }

    pub fn emit_navigate(
        &self,
        window: AppWindow,
        event: events::Navigate,
    ) -> Result<(), crate::Error> {
        window.emit_navigate(self.app, event)
    }

    pub fn navigate(&self, window: AppWindow, path: impl AsRef<str>) -> Result<(), crate::Error> {
        window.navigate(self.app, path)
    }

    pub fn close_all(&self) -> Result<(), crate::Error> {
        for (_, window) in self.app.webview_windows() {
            let _ = window.close();
        }
        Ok(())
    }
}

pub trait WindowsPluginExt {
    fn windows(&self) -> Windows<'_>;
}

impl WindowsPluginExt for AppHandle<tauri::Wry> {
    fn windows(&self) -> Windows<'_> {
        Windows { app: self }
    }
}
