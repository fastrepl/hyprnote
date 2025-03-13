use tauri::{AppHandle, LogicalSize, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

#[derive(Debug, serde::Deserialize, specta::Type, strum::EnumString)]
pub enum HyprWindow {
    #[serde(rename = "main")]
    #[strum(serialize = "main")]
    Main,
    #[serde(rename = "note")]
    #[strum(serialize = "note")]
    Note(String),
}

impl HyprWindow {
    pub fn label(&self) -> String {
        match self {
            Self::Main => "main".into(),
            Self::Note(id) => format!("note-{}", id),
        }
    }

    pub fn title(&self) -> String {
        match self {
            Self::Main => "Hyprnote".into(),
            Self::Note(_) => "Note".into(),
        }
    }

    pub fn get(&self, app: &AppHandle<tauri::Wry>) -> Option<WebviewWindow> {
        let label = self.label();
        app.get_webview_window(&label)
    }

    pub fn show(&self, app: &AppHandle<tauri::Wry>) -> tauri::Result<WebviewWindow> {
        let window = match self.get(app) {
            Some(window) => window,
            None => {
                let url = match self {
                    Self::Main => "/app",
                    Self::Note(id) => &format!("/app/note/{}/sub", id),
                };
                self.window_builder(app, url).build()?
            }
        };

        match self {
            Self::Main => {
                window.set_maximizable(true)?;
                window.set_minimizable(true)?;
                window.set_size(LogicalSize::new(800.0, 600.0))?;
                window.set_min_size(Some(LogicalSize::new(480.0, 360.0)))?;
                window.center()?;
            }
            Self::Note(_) => {
                window.hide()?;
                std::thread::sleep(std::time::Duration::from_millis(80));

                window.set_maximizable(false)?;
                window.set_minimizable(false)?;
                window.set_size(LogicalSize::new(600.0, 800.0))?;
                window.set_min_size(Some(LogicalSize::new(480.0, 360.0)))?;

                {
                    let mut cursor = app.cursor_position().unwrap();
                    cursor.x -= 160.0;
                    cursor.y -= 30.0;
                    window.set_position(cursor)?;
                }
            }
        };

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
    fn window_set_floating(&self, window: HyprWindow, v: bool) -> Result<(), crate::Error>;
}

impl WindowsPluginExt<tauri::Wry> for AppHandle<tauri::Wry> {
    fn window_show(&self, window: HyprWindow) -> Result<WebviewWindow, crate::Error> {
        window.show(self).map_err(crate::Error::TauriError)
    }

    fn window_set_floating(&self, window: HyprWindow, v: bool) -> Result<(), crate::Error> {
        let window = window.get(self).ok_or(crate::Error::WindowNotFound)?;
        window.set_always_on_top(v)?;
        Ok(())
    }
}
