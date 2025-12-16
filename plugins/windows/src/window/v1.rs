use crate::WindowImpl;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type, PartialEq, Eq, Hash)]
#[serde(tag = "type", content = "value")]
pub enum AppWindow {
    #[serde(rename = "onboarding")]
    Onboarding,
    #[serde(rename = "main")]
    Main,
    #[serde(rename = "control")]
    Control,
}

impl std::fmt::Display for AppWindow {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Onboarding => write!(f, "onboarding"),
            Self::Main => write!(f, "main"),
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
            let traffic_light_y = {
                let major = tauri_plugin_os::version()
                    .to_string()
                    .split('.')
                    .next()
                    .and_then(|v| v.parse::<u32>().ok())
                    .unwrap_or(0);

                if major >= 26 { 24.0 } else { 18.0 }
            };

            builder = builder
                .decorations(true)
                .hidden_title(true)
                .theme(Some(tauri::Theme::Light))
                .traffic_light_position(tauri::LogicalPosition::new(12.0, traffic_light_y))
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

fn window_size_with_ratio(
    monitor_width: f64,
    monitor_height: f64,
    aspect_ratio: f64,
    scale: f64,
) -> (f64, f64) {
    let monitor_ratio = monitor_width / monitor_height;

    if aspect_ratio > monitor_ratio {
        let width = monitor_width * scale;
        (width, width / aspect_ratio)
    } else {
        let height = monitor_height * scale;
        (height * aspect_ratio, height)
    }
}

impl WindowImpl for AppWindow {
    fn title(&self) -> String {
        match self {
            Self::Onboarding => "Onboarding".into(),
            Self::Main => "Main".into(),
            Self::Control => "Control".into(),
        }
    }

    fn build_window(
        &self,
        app: &tauri::AppHandle<tauri::Wry>,
    ) -> Result<tauri::WebviewWindow, crate::Error> {
        let margin = tauri::Size::Logical(tauri::LogicalSize::new(24.0, 24.0));

        let monitor = app.primary_monitor().ok().flatten();

        let (monitor_width, monitor_height) = monitor
            .map(|m| {
                let size = m.size();
                let scale = m.scale_factor();
                (size.width as f64 / scale, size.height as f64 / scale)
            })
            .unwrap_or((1920.0, 1080.0));

        let window = match self {
            Self::Onboarding => {
                let (width, height) =
                    window_size_with_ratio(monitor_width, monitor_height, 2.0 / 3.0, 0.7);

                self.window_builder(app, "/app/onboarding")
                    .resizable(false)
                    .inner_size(width, height)
                    .prevent_overflow_with_margin(margin)
                    .center()
                    .build()?
            }
            Self::Main => {
                let (width, height) =
                    window_size_with_ratio(monitor_width, monitor_height, 4.0 / 3.0, 0.8);
                let (min_w, min_h) =
                    window_size_with_ratio(monitor_width, monitor_height, 4.0 / 3.0, 0.4);

                self.window_builder(app, "/app/main")
                    .maximizable(true)
                    .minimizable(true)
                    .inner_size(width, height)
                    .min_inner_size(min_w, min_h)
                    .prevent_overflow_with_margin(margin)
                    .center()
                    .build()?
            }
            Self::Control => self
                .window_builder(app, "/app/control")
                .transparent(true)
                .resizable(true)
                .inner_size(300.0, 200.0)
                .min_inner_size(300.0, 200.0)
                .prevent_overflow()
                .build()?,
        };

        Ok(window)
    }
}
