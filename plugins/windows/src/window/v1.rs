use crate::WindowImpl;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type, PartialEq, Eq, Hash)]
#[serde(tag = "type", content = "value")]
pub enum AppWindow {
    #[serde(rename = "onboarding")]
    Onboarding,
    #[serde(rename = "main")]
    Main,
    #[serde(rename = "settings")]
    Settings,
    #[serde(rename = "auth")]
    Auth,
    #[serde(rename = "chat")]
    Chat,
    #[serde(rename = "devtool")]
    Devtool,
    #[serde(rename = "control")]
    Control,
}

impl std::fmt::Display for AppWindow {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Onboarding => write!(f, "onboarding"),
            Self::Main => write!(f, "main"),
            Self::Settings => write!(f, "settings"),
            Self::Auth => write!(f, "auth"),
            Self::Chat => write!(f, "chat"),
            Self::Devtool => write!(f, "devtool"),
            Self::Control => write!(f, "control"),
        }
    }
}

impl std::str::FromStr for AppWindow {
    type Err = strum::ParseError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "onboarding" => return Ok(Self::Onboarding),
            "main" => return Ok(Self::Main),
            "settings" => return Ok(Self::Settings),
            "auth" => return Ok(Self::Auth),
            "chat" => return Ok(Self::Chat),
            "devtool" => return Ok(Self::Devtool),
            "control" => return Ok(Self::Control),
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

        #[allow(unused_mut)]
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

        #[cfg(target_os = "linux")]
        {
            builder = builder.decorations(false);
        }

        builder
    }
}

impl WindowImpl for AppWindow {
    fn title(&self) -> String {
        match self {
            Self::Onboarding => "Onboarding".into(),
            Self::Main => "Main".into(),
            Self::Settings => "Settings".into(),
            Self::Auth => "Auth".into(),
            Self::Chat => "Chat".into(),
            Self::Devtool => "Devtool".into(),
            Self::Control => "Control".into(),
        }
    }

    fn build_window(
        &self,
        app: &tauri::AppHandle<tauri::Wry>,
    ) -> Result<tauri::WebviewWindow, crate::Error> {
        use tauri::LogicalSize;

        let window = match self {
            Self::Onboarding => {
                let builder = self
                    .window_builder(app, "/app/onboarding")
                    .resizable(false)
                    .min_inner_size(400.0, 600.0);
                let window = builder.build()?;
                window.set_size(LogicalSize::new(400.0, 600.0))?;
                window
            }
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
                    .minimizable(true)
                    .maximizable(true)
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
                    .min_inner_size(400.0, 500.0)
                    .build()?;

                let desired_size = LogicalSize::new(400.0, 600.0);
                window.set_size(LogicalSize::new(1.0, 1.0))?;
                std::thread::sleep(std::time::Duration::from_millis(10));
                window.set_size(desired_size)?;
                window
            }
            Self::Devtool => {
                let window = self
                    .window_builder(app, "/app/devtool")
                    .resizable(true)
                    .min_inner_size(400.0, 600.0)
                    .build()?;

                let desired_size = LogicalSize::new(400.0, 600.0);
                window.set_size(LogicalSize::new(1.0, 1.0))?;
                std::thread::sleep(std::time::Duration::from_millis(10));
                window.set_size(desired_size)?;
                window
            }
            Self::Control => {
                let window = self
                    .window_builder(app, "/app/control")
                    .transparent(true)
                    .resizable(true)
                    .min_inner_size(300.0, 200.0)
                    .build()?;

                let desired_size = LogicalSize::new(300.0, 200.0);
                window.set_size(LogicalSize::new(1.0, 1.0))?;
                std::thread::sleep(std::time::Duration::from_millis(10));
                window.set_size(desired_size)?;
                window
            }
        };

        Ok(window)
    }
}
