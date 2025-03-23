use tauri::{AppHandle, LogicalSize, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder};
use tauri_specta::Event;

use crate::{events, WindowState};

#[derive(Debug, serde::Deserialize, specta::Type, strum::EnumString, PartialEq, Eq, Hash)]
pub enum HyprWindow {
    #[serde(rename = "main")]
    #[strum(serialize = "main")]
    Main,
    #[serde(rename = "note")]
    #[strum(serialize = "note")]
    Note(String),
    #[serde(rename = "calendar")]
    #[strum(serialize = "calendar")]
    Calendar,
    #[serde(rename = "settings")]
    #[strum(serialize = "settings")]
    Settings,
}

impl HyprWindow {
    pub fn label(&self) -> String {
        match self {
            Self::Main => "main".into(),
            Self::Note(id) => format!("note-{}", id),
            Self::Calendar => "calendar".into(),
            Self::Settings => "settings".into(),
        }
    }

    pub fn emit_navigate(
        &self,
        app: &AppHandle<tauri::Wry>,
        path: impl AsRef<str>,
    ) -> Result<(), crate::Error> {
        if let Ok(window) = self.get(app) {
            let mut url = window.url().unwrap();
            url.set_path(path.as_ref());

            let event = events::Navigate {
                path: path.as_ref().into(),
            };
            events::Navigate::emit_to(&event, app, self.label())?;
        }
        Ok(())
    }

    pub fn navigate(
        &self,
        app: &AppHandle<tauri::Wry>,
        path: impl AsRef<str>,
    ) -> Result<(), crate::Error> {
        if let Ok(window) = self.get(app) {
            let mut url = window.url().unwrap();
            url.set_path(path.as_ref());
            window.navigate(url)?;
        }
        Ok(())
    }

    pub fn title(&self) -> String {
        match self {
            Self::Main => "Hyprnote".into(),
            Self::Note(_) => "Note".into(),
            Self::Calendar => "Calendar".into(),
            Self::Settings => "Settings".into(),
        }
    }

    pub fn get(&self, app: &AppHandle<tauri::Wry>) -> Result<WebviewWindow, crate::Error> {
        let label = self.label();
        app.get_webview_window(&label)
            .ok_or(crate::Error::WindowNotFound(label))
    }

    pub fn show(&self, app: &AppHandle<tauri::Wry>) -> Result<WebviewWindow, crate::Error> {
        let (window, created) = match self.get(app) {
            Ok(window) => (window, false),
            Err(_) => {
                let url = match self {
                    Self::Main => "/app/new",
                    Self::Note(id) => &format!("/app/note/{}", id),
                    Self::Calendar => "/app/calendar",
                    Self::Settings => "/app/settings",
                };
                (self.window_builder(app, url).build()?, true)
            }
        };

        if created {
            match self {
                Self::Main => {
                    window.set_maximizable(true)?;
                    window.set_minimizable(true)?;

                    window.set_size(LogicalSize::new(800.0, 600.0))?;
                    window.set_min_size(Some(LogicalSize::new(480.0, 360.0)))?;
                }
                Self::Note(_) => {
                    window.hide()?;
                    std::thread::sleep(std::time::Duration::from_millis(100));

                    window.set_maximizable(false)?;
                    window.set_minimizable(false)?;
                    window.set_size(LogicalSize::new(480.0, 500.0))?;
                    window.set_min_size(Some(LogicalSize::new(480.0, 360.0)))?;

                    {
                        let mut cursor = app.cursor_position().unwrap();
                        cursor.x -= 160.0;
                        cursor.y -= 30.0;
                        window.set_position(cursor)?;
                    }
                }
                Self::Calendar => {
                    window.hide()?;
                    std::thread::sleep(std::time::Duration::from_millis(100));

                    window.set_maximizable(false)?;
                    window.set_minimizable(false)?;
                    window.set_size(LogicalSize::new(640.0, 532.0))?;
                    window.set_min_size(Some(LogicalSize::new(640.0, 532.0)))?;

                    {
                        let mut cursor = app.cursor_position().unwrap();
                        cursor.x -= 640.0;
                        cursor.y -= 30.0;
                        window.set_position(cursor)?;
                    }
                }
                Self::Settings => {
                    window.hide()?;
                    std::thread::sleep(std::time::Duration::from_millis(100));

                    window.set_maximizable(false)?;
                    window.set_minimizable(false)?;
                    window.set_size(LogicalSize::new(800.0, 600.0))?;
                    window.set_min_size(Some(LogicalSize::new(800.0, 600.0)))?;

                    {
                        let mut cursor = app.cursor_position().unwrap();
                        cursor.x -= 800.0;
                        cursor.y -= 30.0;
                        window.set_position(cursor)?;
                    }
                }
            };
        }

        window.set_focus()?;
        window.show()?;
        Ok(window)
    }

    fn window_builder<'a>(
        &'a self,
        app: &'a AppHandle<tauri::Wry>,
        url: impl Into<std::path::PathBuf>,
    ) -> WebviewWindowBuilder<'a, tauri::Wry, AppHandle<tauri::Wry>> {
        let mut builder = WebviewWindow::builder(app, self.label(), WebviewUrl::App(url.into()))
            .title(self.title())
            .decorations(true)
            .disable_drag_drop_handler();

        #[cfg(target_os = "macos")]
        {
            builder = builder
                .hidden_title(true)
                .theme(Some(tauri::Theme::Light))
                .title_bar_style(tauri::TitleBarStyle::Overlay);
        }

        builder
    }
}

pub trait WindowsPluginExt<R: tauri::Runtime> {
    fn window_show(&self, window: HyprWindow) -> Result<WebviewWindow, crate::Error>;
    fn window_get_floating(&self, window: HyprWindow) -> Result<bool, crate::Error>;
    fn window_set_floating(&self, window: HyprWindow, v: bool) -> Result<(), crate::Error>;

    fn window_emit_navigate(
        &self,
        window: HyprWindow,
        path: impl AsRef<str>,
    ) -> Result<(), crate::Error>;

    fn window_navigate(
        &self,
        window: HyprWindow,
        path: impl AsRef<str>,
    ) -> Result<(), crate::Error>;
}

impl WindowsPluginExt<tauri::Wry> for AppHandle<tauri::Wry> {
    fn window_show(&self, window: HyprWindow) -> Result<WebviewWindow, crate::Error> {
        window.show(self)
    }

    fn window_get_floating(&self, window: HyprWindow) -> Result<bool, crate::Error> {
        let app = self.app_handle();
        let state = app.state::<crate::ManagedState>();

        let v = {
            let guard = state.lock().unwrap();
            guard
                .windows
                .get(&window)
                .map(|w| w.floating)
                .unwrap_or(false)
        };

        Ok(v)
    }

    fn window_set_floating(&self, window: HyprWindow, v: bool) -> Result<(), crate::Error> {
        let app = self.app_handle();
        let state = app.state::<crate::ManagedState>();

        window.get(self)?.set_always_on_top(v)?;
        {
            let mut guard = state.lock().unwrap();
            guard
                .windows
                .entry(window)
                .or_insert(WindowState::default())
                .floating = v;
        }

        Ok(())
    }

    fn window_emit_navigate(
        &self,
        window: HyprWindow,
        path: impl AsRef<str>,
    ) -> Result<(), crate::Error> {
        window.emit_navigate(self, path)
    }

    fn window_navigate(
        &self,
        window: HyprWindow,
        path: impl AsRef<str>,
    ) -> Result<(), crate::Error> {
        let app = self.app_handle();
        window.navigate(&app, path)
    }
}
