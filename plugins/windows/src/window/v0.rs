use crate::WindowImpl;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type, PartialEq, Eq, Hash)]
#[serde(tag = "type", content = "value")]
pub enum AppWindow {
    #[serde(rename = "main")]
    Main,
    #[serde(rename = "note")]
    Note(String),
    #[serde(rename = "human")]
    Human(String),
    #[serde(rename = "organization")]
    Organization(String),
    #[serde(rename = "finder")]
    Finder,
    #[serde(rename = "settings")]
    Settings,
    #[serde(rename = "video")]
    Video(String),
    #[serde(rename = "control")]
    Control,
}

impl std::fmt::Display for AppWindow {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Main => write!(f, "main"),
            Self::Note(id) => write!(f, "note-{}", id),
            Self::Human(id) => write!(f, "human-{}", id),
            Self::Organization(id) => write!(f, "organization-{}", id),
            Self::Finder => write!(f, "finder"),
            Self::Settings => write!(f, "settings"),
            Self::Video(id) => write!(f, "video-{}", id),
            Self::Control => write!(f, "control"),
        }
    }
}

impl std::str::FromStr for AppWindow {
    type Err = strum::ParseError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "main" => return Ok(Self::Main),
            "finder" => return Ok(Self::Finder),
            "settings" => return Ok(Self::Settings),
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

impl WindowImpl for AppWindow {
    fn title(&self) -> String {
        match self {
            Self::Main => "Hyprnote".into(),
            Self::Note(_) => "Note".into(),
            Self::Human(_) => "Human".into(),
            Self::Organization(_) => "Organization".into(),
            Self::Finder => "Finder".into(),
            Self::Settings => "Settings".into(),
            Self::Video(_) => "Video".into(),
            Self::Control => "Control".into(),
        }
    }

    fn show_impl(
        &self,
        app: &tauri::AppHandle<tauri::Wry>,
    ) -> Result<tauri::WebviewWindow, crate::Error> {
        use tauri::LogicalSize;

        let monitor = app
            .primary_monitor()?
            .ok_or_else(|| crate::Error::MonitorNotFound)?;

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
            Self::Finder => self
                .window_builder(app, "/app/finder")
                .inner_size(900.0, 650.0)
                .min_inner_size(800.0, 600.0)
                .build()?,
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
            Self::Video(id) => self
                .window_builder(app, &format!("/video?id={}", id))
                .maximizable(false)
                .minimizable(false)
                .inner_size(640.0, 360.0)
                .min_inner_size(640.0, 360.0)
                .build()?,
            Self::Control => {
                use tauri::{WebviewUrl, WebviewWindow};

                let window_width = (monitor.size().width as f64) / monitor.scale_factor();
                let window_height = (monitor.size().height as f64) / monitor.scale_factor();

                let mut builder = WebviewWindow::builder(
                    app,
                    self.label(),
                    WebviewUrl::App("/app/control".into()),
                )
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

                            if let Ok(ns_window) = window.ns_window() {
                                unsafe {
                                    let ns_window = ns_window as *mut AnyObject;
                                    let ns_window = &*ns_window;

                                    const NS_WINDOW_CLOSE_BUTTON: u64 = 0;
                                    const NS_WINDOW_MINIATURIZE_BUTTON: u64 = 1;
                                    const NS_WINDOW_ZOOM_BUTTON: u64 = 2;

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

                crate::spawn_overlay_listener(app.clone(), window.clone());

                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { .. } = event {
                        crate::abort_overlay_join_handle();
                    }
                });

                window
            }
        };

        Ok(window)
    }
}
