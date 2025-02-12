use serde::{Deserialize, Serialize};
use tauri::{
    AppHandle, LogicalPosition, LogicalSize, Manager, WebviewUrl, WebviewWindow,
    WebviewWindowBuilder, Wry,
};

#[derive(Clone, strum::EnumString, strum::Display)]
pub enum HyprWindowId {
    #[strum(serialize = "demo")]
    Demo,
    #[strum(serialize = "main")]
    Main,
}

impl HyprWindowId {
    pub fn label(&self) -> String {
        self.to_string()
    }

    pub fn title(&self) -> String {
        match self {
            Self::Demo => "Hyprnote Demo".to_string(),
            Self::Main => "Hyprnote Main".to_string(),
        }
    }

    pub fn get(&self, app: &AppHandle<Wry>) -> Option<WebviewWindow> {
        let label = self.label();
        app.get_webview_window(&label)
    }
}

#[derive(Clone, Serialize, Deserialize, specta::Type)]
pub enum ShowHyprWindow {
    Demo,
    MainWithoutDemo,
    MainWithDemo,
}

impl ShowHyprWindow {
    pub fn id(&self) -> HyprWindowId {
        match self {
            ShowHyprWindow::Demo { .. } => HyprWindowId::Demo,
            ShowHyprWindow::MainWithoutDemo => HyprWindowId::Main,
            ShowHyprWindow::MainWithDemo => HyprWindowId::Main,
        }
    }

    pub fn show(&self, app: &AppHandle<Wry>) -> tauri::Result<WebviewWindow> {
        let window = match self.id().get(app) {
            Some(window) => window,
            None => {
                let url = match self {
                    Self::Demo => "/",
                    Self::MainWithDemo => "/",
                    Self::MainWithoutDemo => "/",
                };
                self.window_builder(app, url).build()?
            }
        };

        let monitor = app.primary_monitor()?.unwrap();
        let display_width = (monitor.size().width as f64) / monitor.scale_factor();
        let display_height = (monitor.size().height as f64) / monitor.scale_factor();

        match self {
            Self::Demo => {
                let width = display_width * 0.7;
                window.set_maximizable(false)?;
                window.set_minimizable(false)?;
                window.set_size(LogicalSize::new(width, display_height * 0.95))?;
                window.set_position(LogicalPosition::new(20.0, display_height * 0.03))?;
            }
            Self::MainWithDemo => {
                let width = display_width * 0.27;
                window.set_maximizable(false)?;
                window.set_minimizable(false)?;
                window.set_size(LogicalSize::new(width, display_height * 0.95))?;
                window.set_position(LogicalPosition::new(
                    display_width - width - 15.0,
                    display_height * 0.03,
                ))?;
            }

            Self::MainWithoutDemo => {
                window.set_maximizable(true)?;
                window.set_minimizable(true)?;
                window.set_size(LogicalSize::new(800.0, 600.0))?;
                window.set_min_size(Some(LogicalSize::new(480.0, 360.0)))?;
                window.center()?;
            }
        };

        window.set_focus()?;
        Ok(window)
    }

    fn window_builder<'a>(
        &'a self,
        app: &'a AppHandle<Wry>,
        url: impl Into<std::path::PathBuf>,
    ) -> WebviewWindowBuilder<'a, Wry, AppHandle<Wry>> {
        let id = self.id();

        let mut builder = WebviewWindow::builder(app, id.label(), WebviewUrl::App(url.into()))
            .title(id.title())
            .hidden_title(true)
            .decorations(true)
            .disable_drag_drop_handler();

        #[cfg(target_os = "macos")]
        {
            builder = builder.title_bar_style(tauri::TitleBarStyle::Overlay);
        }

        builder
    }
}

pub mod commands {
    use crate::windows::ShowHyprWindow;

    #[tauri::command]
    #[specta::specta]
    pub fn show_window(app: tauri::AppHandle, window: ShowHyprWindow) {
        window.show(&app).unwrap();
    }
}
