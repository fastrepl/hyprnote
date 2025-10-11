use crate::WindowImpl;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type, PartialEq, Eq, Hash)]
#[serde(tag = "type", content = "value")]
pub enum AppWindow {
    #[serde(rename = "main")]
    Main,
    #[serde(rename = "settings")]
    Settings,
    #[serde(rename = "auth")]
    Auth,
    #[serde(rename = "chat")]
    Chat,
}

impl std::fmt::Display for AppWindow {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Main => write!(f, "main"),
            Self::Settings => write!(f, "settings"),
            Self::Auth => write!(f, "auth"),
            Self::Chat => write!(f, "chat"),
        }
    }
}

impl std::str::FromStr for AppWindow {
    type Err = strum::ParseError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "main" => return Ok(Self::Main),
            "settings" => return Ok(Self::Settings),
            "auth" => return Ok(Self::Auth),
            "chat" => return Ok(Self::Chat),
            _ => {}
        }

        Err(strum::ParseError::VariantNotFound)
    }
}

impl AppWindow {
    fn window_builder<'a>(
        &'a self,
        app: &'a tauri::AppHandle<tauri::Wry>,
        url: impl Into<std::path::PathBuf>,
    ) -> tauri::WebviewWindowBuilder<'a, tauri::Wry, tauri::AppHandle<tauri::Wry>> {
        use tauri::{WebviewUrl, WebviewWindow};

        let mut builder = WebviewWindow::builder(app, self.label(), WebviewUrl::App(url.into()))
            .title(self.title())
            .disable_drag_drop_handler();

        #[cfg(target_os = "macos")]
        {
            builder = builder
                .decorations(true)
                .hidden_title(true)
                .theme(Some(tauri::Theme::Light))
                .traffic_light_position(tauri::LogicalPosition::new(12.0, 18.0))
                .title_bar_style(tauri::TitleBarStyle::Overlay);
        }

        #[cfg(target_os = "windows")]
        {
            builder = builder.decorations(false);
        }

        builder
    }
}

impl WindowImpl for AppWindow {
    fn title(&self) -> String {
        match self {
            Self::Main => "Hyprnote".into(),
            Self::Settings => "Settings".into(),
            Self::Auth => "Auth".into(),
            Self::Chat => "Chat".into(),
        }
    }

    fn build_window(
        &self,
        app: &tauri::AppHandle<tauri::Wry>,
    ) -> Result<tauri::WebviewWindow, crate::Error> {
        use tauri::LogicalSize;

        let window = match self {
            Self::Main => {
                let builder = self
                    .window_builder(app, "/app/main")
                    .maximizable(true)
                    .minimizable(true)
                    .min_inner_size(620.0, 500.0);
                let window = builder.build()?;
                window.set_size(LogicalSize::new(910.0, 600.0))?;
                window
            }
            Self::Settings => {
                let window = self
                    .window_builder(app, "/app/settings")
                    .resizable(true)
                    .min_inner_size(800.0, 600.0)
                    .build()?;

                let desired_size = LogicalSize::new(800.0, 600.0);
                window.set_size(LogicalSize::new(1.0, 1.0))?;
                std::thread::sleep(std::time::Duration::from_millis(10));
                window.set_size(desired_size)?;
                window
            }
            Self::Auth => {
                let window = self
                    .window_builder(app, "/app/auth")
                    .resizable(false)
                    .min_inner_size(400.0, 600.0)
                    .build()?;

                let desired_size = LogicalSize::new(400.0, 600.0);
                window.set_size(LogicalSize::new(1.0, 1.0))?;
                std::thread::sleep(std::time::Duration::from_millis(10));
                window.set_size(desired_size)?;
                window
            }
            Self::Chat => {
                let window = self
                    .window_builder(app, "/app/chat")
                    .resizable(true)
                    .min_inner_size(440.0, 500.0)
                    .build()?;

                let desired_size = LogicalSize::new(400.0, 600.0);
                window.set_size(LogicalSize::new(1.0, 1.0))?;
                std::thread::sleep(std::time::Duration::from_millis(10));
                window.set_size(desired_size)?;
                window
            }
        };

        Ok(window)
    }
}
