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
                use tauri_plugin_os::{Version, version};
                let major = match version() {
                    Version::Semantic(major, _, _) => major,
                    Version::Custom(s) => s
                        .split('.')
                        .next()
                        .and_then(|v| v.parse::<u64>().ok())
                        .unwrap_or(0),
                    _ => 0,
                };

                if major >= 26 && cfg!(debug_assertions) {
                    24.0
                } else {
                    18.0
                }
            };

            builder = builder
                .visible(false)
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

const MAX_MAIN_WIDTH: f64 = 1600.0;
const MAX_MAIN_HEIGHT: f64 = 1000.0;
const MIN_MAIN_WIDTH: f64 = 620.0;
const MIN_MAIN_HEIGHT: f64 = 500.0;

const MAX_ONBOARDING_WIDTH: f64 = 900.0;
const MAX_ONBOARDING_HEIGHT: f64 = 700.0;
const MIN_ONBOARDING_WIDTH: f64 = 400.0;
const MIN_ONBOARDING_HEIGHT: f64 = 600.0;

fn window_size_with_ratio(
    monitor_width: f64,
    monitor_height: f64,
    aspect_ratio: f64,
    scale: f64,
    min_width: f64,
    min_height: f64,
    max_width: f64,
    max_height: f64,
) -> (f64, f64) {
    let monitor_ratio = monitor_width / monitor_height;

    let (width, height) = if aspect_ratio > monitor_ratio {
        let width = monitor_width * scale;
        (width, width / aspect_ratio)
    } else {
        let height = monitor_height * scale;
        (height * aspect_ratio, height)
    };

    let (width, height) = if width > max_width || height > max_height {
        let scale_w = max_width / width;
        let scale_h = max_height / height;
        let scale = scale_w.min(scale_h);
        (width * scale, height * scale)
    } else {
        (width, height)
    };

    (width.max(min_width), height.max(min_height))
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
                let work_area = m.work_area();
                let scale = m.scale_factor();
                (
                    work_area.size.width as f64 / scale,
                    work_area.size.height as f64 / scale,
                )
            })
            .unwrap_or((1920.0, 1080.0));

        let window = match self {
            Self::Onboarding => {
                let (width, height) = window_size_with_ratio(
                    monitor_width,
                    monitor_height,
                    2.0 / 3.0,
                    0.7,
                    MIN_ONBOARDING_WIDTH,
                    MIN_ONBOARDING_HEIGHT,
                    MAX_ONBOARDING_WIDTH,
                    MAX_ONBOARDING_HEIGHT,
                );

                self.window_builder(app, "/app/onboarding")
                    .resizable(false)
                    .inner_size(width, height)
                    .min_inner_size(MIN_ONBOARDING_WIDTH, MIN_ONBOARDING_HEIGHT)
                    .prevent_overflow_with_margin(margin)
                    .center()
                    .build()?
            }
            Self::Main => {
                let (width, height) = window_size_with_ratio(
                    monitor_width,
                    monitor_height,
                    4.0 / 3.0,
                    0.8,
                    MIN_MAIN_WIDTH,
                    MIN_MAIN_HEIGHT,
                    MAX_MAIN_WIDTH,
                    MAX_MAIN_HEIGHT,
                );

                self.window_builder(app, "/app/main")
                    .maximizable(true)
                    .minimizable(true)
                    .inner_size(width, height)
                    .min_inner_size(MIN_MAIN_WIDTH, MIN_MAIN_HEIGHT)
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
