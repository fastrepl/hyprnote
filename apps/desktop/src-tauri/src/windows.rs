use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder, Wry};

#[derive(Clone)]
pub enum HyprWindowId {
    Demo,
    Main,
}

impl std::str::FromStr for HyprWindowId {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Ok(match s {
            "demo" => Self::Demo,
            "main" => Self::Main,
            _ => return Err(format!("unknown window label: {}", s)),
        })
    }
}

impl std::fmt::Display for HyprWindowId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Demo => write!(f, "demo"),
            Self::Main => write!(f, "main"),
        }
    }
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
    Demo { url: String },
    Main,
}

impl ShowHyprWindow {
    pub fn id(&self) -> HyprWindowId {
        match self {
            ShowHyprWindow::Demo { .. } => HyprWindowId::Demo,
            ShowHyprWindow::Main => HyprWindowId::Main,
        }
    }

    pub fn show(&self, app: &AppHandle<Wry>) -> tauri::Result<WebviewWindow> {
        if let Some(window) = self.id().get(app) {
            window.set_focus()?;
            return Ok(window);
        }

        let window = match self {
            Self::Demo { url: _ } => self
                .window_builder(app)
                .maximized(false)
                .minimizable(false)
                .maximizable(false)
                .build()?,
            Self::Main => self
                .window_builder(app)
                .minimizable(true)
                .maximizable(true)
                .inner_size(1160.0, 680.0)
                .center()
                .build()?,
        };

        window.set_focus()?;
        Ok(window)
    }

    fn window_builder<'a>(
        &'a self,
        app: &'a AppHandle<Wry>,
    ) -> WebviewWindowBuilder<'a, Wry, AppHandle<Wry>> {
        let id = self.id();

        let builder = WebviewWindow::builder(app, id.label(), WebviewUrl::default())
            .title(id.title())
            .visible(true)
            .accept_first_mouse(false)
            .shadow(false)
            .transparent(true)
            .decorations(false);

        builder
    }
}
