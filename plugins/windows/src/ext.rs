use tauri::{AppHandle, Manager, WebviewWindow};
use tauri_specta::Event;

use crate::{AppWindow, WindowImpl, WindowReadyState, events};

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

    fn prepare_show(&self, app: &AppHandle<tauri::Wry>) {
        #[cfg(target_os = "macos")]
        let _ = app.set_activation_policy(tauri::ActivationPolicy::Regular);

        if matches!(self, Self::Main) {
            use tauri_plugin_analytics::{AnalyticsPayload, AnalyticsPluginExt};

            let e = AnalyticsPayload::builder("show_main_window").build();
            app.analytics().event_fire_and_forget(e);
        }
    }

    fn try_show_existing(
        &self,
        app: &AppHandle<tauri::Wry>,
    ) -> Result<Option<WebviewWindow>, crate::Error> {
        if let Some(window) = self.get(app) {
            window.show()?;
            window.set_focus()?;
            return Ok(Some(window));
        }
        Ok(None)
    }

    fn finalize_show(&self, window: &WebviewWindow) -> Result<(), crate::Error> {
        if let Self::Main = self {
            use tauri_plugin_window_state::{StateFlags, WindowExt};
            let _ = window.restore_state(StateFlags::SIZE);
        }

        window.show()?;
        window.set_focus()?;

        Ok(())
    }

    pub fn show(&self, app: &AppHandle<tauri::Wry>) -> Result<WebviewWindow, crate::Error>
    where
        Self: WindowImpl,
    {
        self.prepare_show(app);

        if let Some(window) = self.try_show_existing(app)? {
            return Ok(window);
        }

        let window = self.build_window(app)?;
        std::thread::sleep(std::time::Duration::from_millis(100));
        self.finalize_show(&window)?;

        Ok(window)
    }

    pub async fn show_async(
        &self,
        app: &AppHandle<tauri::Wry>,
    ) -> Result<WebviewWindow, crate::Error>
    where
        Self: WindowImpl,
    {
        self.prepare_show(app);

        if let Some(window) = self.try_show_existing(app)? {
            return Ok(window);
        }

        let ready_rx = app
            .try_state::<WindowReadyState>()
            .map(|state| state.register(self.label()));

        let window = self.build_window(app)?;

        if let Some(rx) = ready_rx {
            let _ = tokio::time::timeout(std::time::Duration::from_secs(2), rx).await;
        }

        self.finalize_show(&window)?;

        Ok(window)
    }
}

pub struct Windows<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

impl<'a, M: tauri::Manager<tauri::Wry>> Windows<'a, tauri::Wry, M> {
    pub fn show(&self, window: AppWindow) -> Result<WebviewWindow, crate::Error> {
        window.show(self.manager.app_handle())
    }

    pub async fn show_async(&self, window: AppWindow) -> Result<WebviewWindow, crate::Error> {
        window.show_async(self.manager.app_handle()).await
    }

    pub fn hide(&self, window: AppWindow) -> Result<(), crate::Error> {
        window.hide(self.manager.app_handle())
    }

    pub fn close(&self, window: AppWindow) -> Result<(), crate::Error> {
        window.close(self.manager.app_handle())
    }

    pub fn destroy(&self, window: AppWindow) -> Result<(), crate::Error> {
        window.destroy(self.manager.app_handle())
    }

    pub fn is_focused(&self, window: AppWindow) -> Result<bool, crate::Error> {
        Ok(window
            .get(self.manager.app_handle())
            .and_then(|w| w.is_focused().ok())
            .unwrap_or(false))
    }

    pub fn is_exists(&self, window: AppWindow) -> Result<bool, crate::Error> {
        Ok(window.get(self.manager.app_handle()).is_some())
    }

    pub fn emit_navigate(
        &self,
        window: AppWindow,
        event: events::Navigate,
    ) -> Result<(), crate::Error> {
        window.emit_navigate(self.manager.app_handle(), event)
    }

    pub fn navigate(&self, window: AppWindow, path: impl AsRef<str>) -> Result<(), crate::Error> {
        window.navigate(self.manager.app_handle(), path)
    }

    pub fn close_all(&self) -> Result<(), crate::Error> {
        for (_, window) in self.manager.webview_windows() {
            let _ = window.close();
        }
        Ok(())
    }
}

pub trait WindowsPluginExt<R: tauri::Runtime> {
    fn windows(&self) -> Windows<'_, R, Self>
    where
        Self: tauri::Manager<R> + Sized;
}

impl<T: tauri::Manager<tauri::Wry>> WindowsPluginExt<tauri::Wry> for T {
    fn windows(&self) -> Windows<'_, tauri::Wry, Self>
    where
        Self: Sized,
    {
        Windows {
            manager: self,
            _runtime: std::marker::PhantomData,
        }
    }
}
