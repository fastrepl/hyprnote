use tauri::{
    AppHandle, LogicalPosition, LogicalSize, Manager, WebviewUrl, WebviewWindow,
    WebviewWindowBuilder,
};
use tauri_specta::Event;

use crate::{events, WindowState};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type, PartialEq, Eq, Hash)]
#[serde(tag = "type", content = "value")]
pub enum HyprWindow {
    #[serde(rename = "main")]
    Main,
    #[serde(rename = "note")]
    Note(String),
    #[serde(rename = "human")]
    Human(String),
    #[serde(rename = "organization")]
    Organization(String),
    #[serde(rename = "calendar")]
    Calendar,
    #[serde(rename = "settings")]
    Settings,
    #[serde(rename = "video")]
    Video(String),
    #[serde(rename = "plans")]
    Plans,
    #[serde(rename = "control")]
    Control,
}

impl std::fmt::Display for HyprWindow {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Main => write!(f, "main"),
            Self::Note(id) => write!(f, "note-{}", id),
            Self::Human(id) => write!(f, "human-{}", id),
            Self::Organization(id) => write!(f, "organization-{}", id),
            Self::Calendar => write!(f, "calendar"),
            Self::Settings => write!(f, "settings"),
            Self::Video(id) => write!(f, "video-{}", id),
            Self::Plans => write!(f, "plans"),
            Self::Control => write!(f, "control"),
        }
    }
}

impl std::str::FromStr for HyprWindow {
    type Err = strum::ParseError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "main" => return Ok(Self::Main),
            "calendar" => return Ok(Self::Calendar),
            "settings" => return Ok(Self::Settings),
            "control" => return Ok(Self::Control),
            "plans" => return Ok(Self::Plans),
            _ => {}
        }

        if let Some((prefix, id)) = s.split_once('-') {
            match prefix {
                "note" => return Ok(Self::Note(id.to_string())),
                "human" => return Ok(Self::Human(id.to_string())),
                "organization" => return Ok(Self::Organization(id.to_string())),
                "video" => return Ok(Self::Video(id.to_string())),
                _ => {}
            }
        }

        Err(strum::ParseError::VariantNotFound)
    }
}

#[derive(
    Debug,
    serde::Serialize,
    serde::Deserialize,
    specta::Type,
    strum::EnumString,
    PartialEq,
    Eq,
    Hash,
)]
pub enum KnownPosition {
    #[serde(rename = "left-half")]
    LeftHalf,
    #[serde(rename = "right-half")]
    RightHalf,
    #[serde(rename = "center")]
    Center,
}

impl HyprWindow {
    pub fn label(&self) -> String {
        self.to_string()
    }

    pub fn emit_navigate(
        &self,
        app: &AppHandle<tauri::Wry>,
        path: impl AsRef<str>,
    ) -> Result<(), crate::Error> {
        if let Some(window) = self.get(app) {
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

    pub fn title(&self) -> String {
        match self {
            Self::Main => "Hyprnote".into(),
            Self::Note(_) => "Note".into(),
            Self::Human(_) => "Human".into(),
            Self::Organization(_) => "Organization".into(),
            Self::Calendar => "Calendar".into(),
            Self::Settings => "Settings".into(),
            Self::Video(_) => "Video".into(),
            Self::Plans => "Plans".into(),
            Self::Control => "Control".into(),
        }
    }

    pub fn get(&self, app: &AppHandle<tauri::Wry>) -> Option<WebviewWindow> {
        let label = self.label();
        app.get_webview_window(&label)
    }

    pub fn get_default_size(&self) -> LogicalSize<f64> {
        match self {
            Self::Main => LogicalSize::new(910.0, 600.0),
            Self::Note(_) => LogicalSize::new(480.0, 500.0),
            Self::Human(_) => LogicalSize::new(480.0, 500.0),
            Self::Organization(_) => LogicalSize::new(480.0, 500.0),
            Self::Calendar => LogicalSize::new(640.0, 532.0),
            Self::Settings => LogicalSize::new(800.0, 600.0),
            Self::Video(_) => LogicalSize::new(640.0, 360.0),
            Self::Plans => LogicalSize::new(900.0, 600.0),
            Self::Control => LogicalSize::new(300.0, 100.0),
        }
    }

    pub fn get_min_size(&self) -> LogicalSize<f64> {
        match self {
            Self::Main => LogicalSize::new(620.0, 500.0),
            Self::Note(_) => LogicalSize::new(480.0, 360.0),
            Self::Human(_) => LogicalSize::new(480.0, 360.0),
            Self::Organization(_) => LogicalSize::new(480.0, 360.0),
            Self::Calendar => LogicalSize::new(640.0, 532.0),
            Self::Settings => LogicalSize::new(800.0, 600.0),
            Self::Video(_) => LogicalSize::new(640.0, 360.0),
            Self::Plans => LogicalSize::new(900.0, 600.0),
            Self::Control => LogicalSize::new(300.0, 100.0),
        }
    }

    #[cfg(target_os = "macos")]
    pub fn traffic_lights_position(&self) -> Option<LogicalPosition<f32>> {
        match self {
            Self::Control => None,
            _ => Some(LogicalPosition::new(12.0, 20.0)),
        }
    }

    pub fn position(
        &self,
        app: &AppHandle<tauri::Wry>,
        pos: KnownPosition,
    ) -> Result<(), crate::Error> {
        if let Some(window) = self.get(app) {
            let monitor = window
                .current_monitor()?
                .ok_or(crate::Error::MonitorNotFound)?;

            let monitor_size = monitor.size();
            let window_size = window.outer_size()?;

            let scale_factor = window.scale_factor()?;
            let logical_monitor_width = monitor_size.width as f64 / scale_factor;
            let logical_monitor_height = monitor_size.height as f64 / scale_factor;
            let logical_window_width = window_size.width as f64 / scale_factor;
            let logical_window_height = window_size.height as f64 / scale_factor;

            let split_point = logical_monitor_width * 0.5;

            let y = (logical_monitor_height - logical_window_height) / 2.0;
            let x = match pos {
                KnownPosition::LeftHalf => split_point - logical_window_width,
                KnownPosition::RightHalf => split_point,
                KnownPosition::Center => split_point - logical_window_width / 2.0,
            };

            let x = x.max(0.0).min(logical_monitor_width - logical_window_width);
            let y = y
                .max(0.0)
                .min(logical_monitor_height - logical_window_height);

            window.set_position(LogicalPosition::new(x, y))?;
        }

        Ok(())
    }

    fn destroy(&self, app: &AppHandle<tauri::Wry>) -> Result<(), crate::Error> {
        if let Some(window) = self.get(app) {
            window.destroy()?;
        }

        Ok(())
    }

    pub fn is_visible(&self, app: &AppHandle<tauri::Wry>) -> Result<bool, crate::Error> {
        self.get(app).map_or(Ok(false), |w| {
            w.is_visible().map_err(crate::Error::TauriError)
        })
    }

    pub fn show(&self, app: &AppHandle<tauri::Wry>) -> Result<WebviewWindow, crate::Error> {
        let (window, created) = match self.get(app) {
            Some(window) => (window, false),
            None => {
                let url = match self {
                    Self::Main => "/app/new",
                    Self::Note(id) => &format!("/app/note/{}", id),
                    Self::Human(id) => &format!("/app/human/{}", id),
                    Self::Organization(id) => &format!("/app/organization/{}", id),
                    Self::Calendar => "/app/calendar",
                    Self::Settings => "/app/settings",
                    Self::Video(id) => &format!("/video?id={}", id),
                    Self::Plans => "/app/plans",
                    Self::Control => "/app/control",
                };
                (self.window_builder(app, url).build()?, true)
            }
        };

        if created {
            let default_size = self.get_default_size();
            let min_size = self.get_min_size();

            match self {
                Self::Main => {
                    window.set_maximizable(true)?;
                    window.set_minimizable(true)?;

                    window.set_size(default_size)?;
                    window.set_min_size(Some(min_size))?;
                }
                Self::Note(_) => {
                    window.hide()?;
                    std::thread::sleep(std::time::Duration::from_millis(100));

                    window.set_maximizable(false)?;
                    window.set_minimizable(false)?;

                    window.set_size(default_size)?;
                    window.set_min_size(Some(min_size))?;

                    window.center()?;
                }
                Self::Human(_) => {
                    window.hide()?;
                    std::thread::sleep(std::time::Duration::from_millis(100));

                    window.set_maximizable(false)?;
                    window.set_minimizable(false)?;

                    window.set_size(default_size)?;
                    window.set_min_size(Some(min_size))?;

                    window.center()?;
                }
                Self::Organization(_) => {
                    window.hide()?;
                    std::thread::sleep(std::time::Duration::from_millis(100));

                    window.set_maximizable(false)?;
                    window.set_minimizable(false)?;

                    window.set_size(default_size)?;
                    window.set_min_size(Some(min_size))?;

                    window.center()?;
                }
                Self::Calendar => {
                    window.hide()?;
                    std::thread::sleep(std::time::Duration::from_millis(100));

                    window.set_maximizable(false)?;
                    window.set_minimizable(false)?;

                    window.set_size(default_size)?;
                    window.set_min_size(Some(min_size))?;

                    window.center()?;
                }
                Self::Settings => {
                    window.hide()?;
                    std::thread::sleep(std::time::Duration::from_millis(100));

                    window.set_maximizable(false)?;
                    window.set_minimizable(false)?;

                    window.set_size(default_size)?;
                    window.set_min_size(Some(min_size))?;

                    window.center()?;
                }
                Self::Video(_) => {
                    window.hide()?;
                    std::thread::sleep(std::time::Duration::from_millis(100));

                    window.set_resizable(false)?;
                    window.set_maximizable(false)?;
                    window.set_minimizable(false)?;

                    window.set_size(default_size)?;
                    window.set_min_size(Some(min_size))?;
                }
                Self::Plans => {
                    window.hide()?;
                    std::thread::sleep(std::time::Duration::from_millis(100));

                    window.set_maximizable(false)?;
                    window.set_minimizable(false)?;

                    window.set_size(default_size)?;
                    window.set_min_size(Some(min_size))?;

                    window.center()?;
                }
                Self::Control => {
                    window.set_always_on_top(true)?;

                    #[cfg(target_os = "macos")]
                    {
                        app.run_on_main_thread({
                            let window = window.clone();
                            move || {
                                use tauri_nspanel::WebviewWindowExt as NSPanelWebviewWindowExt;
                                use tauri_nspanel::cocoa::appkit::{
                                    NSMainMenuWindowLevel, NSWindowCollectionBehavior,
                                };

                                if let Ok(panel) = window.to_panel() {
                                    panel.set_level(NSMainMenuWindowLevel);
                                    panel.set_collection_behaviour(
                                        NSWindowCollectionBehavior::NSWindowCollectionBehaviorTransient
                                            | NSWindowCollectionBehavior::NSWindowCollectionBehaviorMoveToActiveSpace
                                            | NSWindowCollectionBehavior::NSWindowCollectionBehaviorFullScreenAuxiliary
                                            | NSWindowCollectionBehavior::NSWindowCollectionBehaviorIgnoresCycle,
                                    );
                                }
                            }
                        })
                        .ok();
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
            .accept_first_mouse(true)
            .shadow(true)
            .disable_drag_drop_handler();

        #[cfg(target_os = "macos")]
        {
            builder = builder.theme(Some(tauri::Theme::Light))
        }

        #[cfg(target_os = "macos")]
        {
            if self.traffic_lights_position().is_some() {
                builder = builder
                    .hidden_title(true)
                    .title_bar_style(tauri::TitleBarStyle::Overlay);
            } else {
                builder = builder.decorations(false)
            }
        }

        #[cfg(target_os = "windows")]
        {
            builder = builder.decorations(false);
        }

        builder
    }
}

pub trait WindowsPluginExt<R: tauri::Runtime> {
    fn window_show(&self, window: HyprWindow) -> Result<WebviewWindow, crate::Error>;
    fn window_destroy(&self, window: HyprWindow) -> Result<(), crate::Error>;
    fn window_position(&self, window: HyprWindow, pos: KnownPosition) -> Result<(), crate::Error>;
    fn window_resize_default(&self, window: HyprWindow) -> Result<(), crate::Error>;
    fn window_is_visible(&self, window: HyprWindow) -> Result<bool, crate::Error>;

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

    fn window_destroy(&self, window: HyprWindow) -> Result<(), crate::Error> {
        window.destroy(self)
    }

    fn window_position(&self, window: HyprWindow, pos: KnownPosition) -> Result<(), crate::Error> {
        window.position(self, pos)
    }

    fn window_resize_default(&self, window: HyprWindow) -> Result<(), crate::Error> {
        if let Some(w) = window.get(self) {
            let default_size = window.get_default_size();
            w.set_size(default_size)?;
        }

        Ok(())
    }

    fn window_is_visible(&self, window: HyprWindow) -> Result<bool, crate::Error> {
        window.is_visible(self)
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

        if let Some(w) = window.get(self) {
            w.set_always_on_top(v)?;

            {
                let mut guard = state.lock().unwrap();
                guard
                    .windows
                    .entry(window)
                    .or_insert(WindowState::default())
                    .floating = v;
            }
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
        window.navigate(self, path)
    }
}
