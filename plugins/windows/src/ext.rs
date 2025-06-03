use tauri::{
    AppHandle, LogicalPosition, LogicalSize, Manager, WebviewUrl, WebviewWindow,
    WebviewWindowBuilder,
};
use tauri_specta::Event;
use uuid::Uuid;

use crate::events;

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
            _ => {}
        }

        if let Some((prefix, id)) = s.split_once('-') {
            match prefix {
                "note" => return Ok(Self::Note(id.to_string())),
                "human" => return Ok(Self::Human(id.to_string())),
                "organization" => return Ok(Self::Organization(id.to_string())),
                "video" => return Ok(Self::Video(id.to_string())),
                "plans" => return Ok(Self::Plans),
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

    fn close(&self, app: &AppHandle<tauri::Wry>) -> Result<(), crate::Error> {
        match self {
            HyprWindow::Control => {
                crate::abort_overlay_join_handle();
                
                #[cfg(target_os = "macos")]
                {
                    use tauri_nspanel::ManagerExt;
                    if let Ok(panel) = app.get_webview_panel(&HyprWindow::Control.label()) {
                        app.run_on_main_thread({
                            let panel = panel.clone();
                            move || {
                                panel.set_released_when_closed(true);
                                panel.close();
                            }
                        }).map_err(|e| tracing::warn!("Failed to run panel close on main thread: {}", e)).ok();
                    }
                }
                #[cfg(not(target_os = "macos"))]
                {
                    if let Some(window) = self.get(app) {
                        let _ = window.close();
                    }
                }
            }
            _ => {
                if let Some(window) = self.get(app) {
                    let _ = window.close();
                }
            }
        }

        Ok(())
    }

    fn hide(&self, app: &AppHandle<tauri::Wry>) -> Result<(), crate::Error> {
        if let Some(window) = self.get(app) {
            window.hide()?;
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
        if self == &Self::Main {
            use tauri_plugin_analytics::{hypr_analytics::AnalyticsPayload, AnalyticsPluginExt};
            use tauri_plugin_auth::{AuthPluginExt, StoreKey};

            let user_id = app
                .get_from_store(StoreKey::UserId)?
                .unwrap_or("UNKNOWN".into());

            let e = AnalyticsPayload::for_user(user_id)
                .event("show_main_window")
                .build();

            let app_clone = app.clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = app_clone.event(e).await {
                    tracing::error!("failed_to_send_analytics: {:?}", e);
                }
            });
        }

        if let Some(window) = self.get(app) {
            window.set_focus()?;
            window.show()?;
            return Ok(window);
        }

        let monitor = app.primary_monitor()?.ok_or_else(|| crate::Error::MonitorNotFound)?;

        let window = match self {
            Self::Main => {
                let builder = self
                    .window_builder(app, "/app/new")
                    .maximizable(true)
                    .minimizable(true)
                    .min_inner_size(620.0, 500.0);
                let window = builder.build()?;
                window.set_size(LogicalSize::new(910.0, 600.0))?;
                window
            }
            Self::Note(id) => self
                .window_builder(app, &format!("/app/note/{}", id))
                .inner_size(480.0, 500.0)
                .min_inner_size(480.0, 360.0)
                .center()
                .build()?,
            Self::Human(id) => self
                .window_builder(app, &format!("/app/human/{}", id))
                .inner_size(480.0, 500.0)
                .min_inner_size(480.0, 360.0)
                .center()
                .build()?,
            Self::Organization(id) => self
                .window_builder(app, &format!("/app/organization/{}", id))
                .inner_size(480.0, 500.0)
                .min_inner_size(480.0, 360.0)
                .center()
                .build()?,
            Self::Calendar => self
                .window_builder(app, "/app/calendar")
                .inner_size(640.0, 532.0)
                .min_inner_size(640.0, 532.0)
                .build()?,
            Self::Settings => self
                .window_builder(app, "/app/settings")
                .inner_size(800.0, 600.0)
                .min_inner_size(800.0, 600.0)
                .build()?,
            Self::Video(id) => self
                .window_builder(app, &format!("/video?id={}", id))
                .maximizable(false)
                .minimizable(false)
                .inner_size(640.0, 360.0)
                .min_inner_size(640.0, 360.0)
                .build()?,
            Self::Plans => self
                .window_builder(app, "/app/plans")
                .maximizable(false)
                .minimizable(false)
                .inner_size(900.0, 600.0)
                .min_inner_size(900.0, 600.0)
                .build()?,
            Self::Control => {
                let window_width = (monitor.size().width as f64) / monitor.scale_factor();
                let window_height = (monitor.size().height as f64) / monitor.scale_factor();
                
                let mut builder = WebviewWindow::builder(app, self.label(), WebviewUrl::App("/app/control".into()))
                    .title("")
                    .disable_drag_drop_handler()
                    .maximized(false)
                    .resizable(false)
                    .fullscreen(false)
                    .shadow(false)
                    .always_on_top(true)
                    .visible_on_all_workspaces(true)
                    .accept_first_mouse(true)
                    .content_protected(true)
                    .inner_size(window_width, window_height)
                    .skip_taskbar(true)
                    .position(0.0, 0.0)
                    .transparent(true);

                #[cfg(target_os = "macos")]
                {
                    builder = builder
                        .title_bar_style(tauri::TitleBarStyle::Overlay)
                        .hidden_title(true);
                }

                #[cfg(not(target_os = "macos"))]
                {
                    builder = builder.decorations(false);
                }

                let window = builder.build()?;

                #[cfg(target_os = "macos")]
                {
                    #[allow(deprecated, unexpected_cfgs)]
                    app.run_on_main_thread({
                        let window = window.clone();
                        move || {
                            use objc2::runtime::AnyObject;
                            use objc2::msg_send;
                            
                            // Hide traffic lights using cocoa APIs
                            if let Ok(ns_window) = window.ns_window() {
                                unsafe {
                                    let ns_window = ns_window as *mut AnyObject;
                                    let ns_window = &*ns_window;
                                    
                                    // NSWindow button type constants
                                    const NS_WINDOW_CLOSE_BUTTON: u64 = 0;
                                    const NS_WINDOW_MINIATURIZE_BUTTON: u64 = 1;
                                    const NS_WINDOW_ZOOM_BUTTON: u64 = 2;
                                    
                                    // Get and hide the standard window buttons
                                    let close_button: *mut AnyObject = msg_send![ns_window, standardWindowButton: NS_WINDOW_CLOSE_BUTTON];
                                    let miniaturize_button: *mut AnyObject = msg_send![ns_window, standardWindowButton: NS_WINDOW_MINIATURIZE_BUTTON];
                                    let zoom_button: *mut AnyObject = msg_send![ns_window, standardWindowButton: NS_WINDOW_ZOOM_BUTTON];
                                    
                                    if !close_button.is_null() {
                                        let _: () = msg_send![close_button, setHidden: true];
                                    }
                                    if !miniaturize_button.is_null() {
                                        let _: () = msg_send![miniaturize_button, setHidden: true];
                                    }
                                    if !zoom_button.is_null() {
                                        let _: () = msg_send![zoom_button, setHidden: true];
                                    }
                                    
                                    // Make title bar transparent instead of changing style mask
                                    let _: () = msg_send![ns_window, setTitlebarAppearsTransparent: true];
                                    let _: () = msg_send![ns_window, setMovableByWindowBackground: true];
                                }
                            }
                        }
                    }).map_err(|e| tracing::warn!("Failed to run window setup on main thread: {}", e)).ok();
                }

                let join_handle = crate::spawn_overlay_listener(app.clone(), window.clone());
                crate::set_overlay_join_handle(join_handle);
                
                // Cancel the overlay listener when the window is closed
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { .. } = event {
                        crate::abort_overlay_join_handle();
                    }
                });
                
                window
            }
        };

        window.set_focus()?;
        window.show()?;

        if self == &Self::Main {
            if let Err(e) = app.handle_main_window_visibility(true) {
                tracing::error!("failed_to_handle_main_window_visibility: {:?}", e);
            }
        }

        Ok(window)
    }

    fn window_builder<'a>(
        &'a self,
        app: &'a AppHandle<tauri::Wry>,
        url: impl Into<std::path::PathBuf>,
    ) -> WebviewWindowBuilder<'a, tauri::Wry, AppHandle<tauri::Wry>> {
        let mut builder = WebviewWindow::builder(app, self.label(), WebviewUrl::App(url.into()))
            .title(self.title())
            .disable_drag_drop_handler();

        #[cfg(target_os = "macos")]
        {
            builder = builder
                .decorations(true)
                .hidden_title(true)
                .theme(Some(tauri::Theme::Light))
                .traffic_light_position(tauri::LogicalPosition::new(12.0, 20.0))
                .title_bar_style(tauri::TitleBarStyle::Overlay);
        }

        #[cfg(target_os = "windows")]
        {
            builder = builder.decorations(false);
        }

        builder
    }
}

pub trait WindowsPluginExt<R: tauri::Runtime> {
    fn handle_main_window_visibility(&self, visible: bool) -> Result<(), crate::Error>;

    fn window_show(&self, window: HyprWindow) -> Result<WebviewWindow, crate::Error>;
    fn window_close(&self, window: HyprWindow) -> Result<(), crate::Error>;
    fn window_hide(&self, window: HyprWindow) -> Result<(), crate::Error>;
    fn window_destroy(&self, window: HyprWindow) -> Result<(), crate::Error>;
    fn window_position(&self, window: HyprWindow, pos: KnownPosition) -> Result<(), crate::Error>;
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
    fn handle_main_window_visibility(&self, visible: bool) -> Result<(), crate::Error> {
        let state = self.state::<crate::ManagedState>();
        let mut guard = state.lock().unwrap();

        let window_state = guard.windows.entry(HyprWindow::Main).or_default();

        if window_state.visible != visible {
            let previous_visible = window_state.visible;
            window_state.visible = visible;

            let event_name = if visible {
                "show_main_window"
            } else {
                "hide_main_window"
            };

            let session_id = if !previous_visible && visible {
                let new_session_id = Uuid::new_v4().to_string();
                window_state.id = new_session_id.clone();
                new_session_id
            } else {
                window_state.id.clone()
            };

            let user_id = {
                use tauri_plugin_auth::{AuthPluginExt, StoreKey};

                self.get_from_store(StoreKey::UserId)?
                    .unwrap_or("UNKNOWN".into())
            };

            {
                use tauri_plugin_analytics::{
                    hypr_analytics::AnalyticsPayload, AnalyticsPluginExt,
                };

                let e = AnalyticsPayload::for_user(user_id)
                    .event(event_name)
                    .with("session_id", session_id)
                    .build();

                let app_clone = self.clone();
                tauri::async_runtime::spawn(async move {
                    if let Err(e) = app_clone.event(e).await {
                        tracing::error!("failed_to_send_analytics: {:?}", e);
                    }
                });
            }
        }

        Ok(())
    }

    fn window_show(&self, window: HyprWindow) -> Result<WebviewWindow, crate::Error> {
        window.show(self)
    }

    fn window_close(&self, window: HyprWindow) -> Result<(), crate::Error> {
        window.close(self)
    }

    fn window_hide(&self, window: HyprWindow) -> Result<(), crate::Error> {
        window.hide(self)
    }

    fn window_destroy(&self, window: HyprWindow) -> Result<(), crate::Error> {
        window.destroy(self)
    }

    fn window_position(&self, window: HyprWindow, pos: KnownPosition) -> Result<(), crate::Error> {
        window.position(self, pos)
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
                guard.windows.entry(window).or_default().floating = v;
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