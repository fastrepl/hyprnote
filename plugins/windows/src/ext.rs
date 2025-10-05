use tauri::{AppHandle, LogicalSize, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder};
use tauri_specta::Event;
use uuid::Uuid;

use crate::{events, AppWindow, WindowImpl};

impl AppWindow {
    pub fn emit_navigate(
        &self,
        app: &AppHandle<tauri::Wry>,
        event: events::Navigate,
    ) -> Result<(), crate::Error> {
        if let Some(_) = self.get(app) {
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

    pub fn get(&self, app: &AppHandle<tauri::Wry>) -> Option<WebviewWindow> {
        let label = self.label();
        app.get_webview_window(&label)
    }

    fn destroy(&self, app: &AppHandle<tauri::Wry>) -> Result<(), crate::Error> {
        if let Some(window) = self.get(app) {
            window.destroy()?;
        }

        Ok(())
    }

    pub fn show(&self, app: &AppHandle<tauri::Wry>) -> Result<WebviewWindow, crate::Error> {
        #[cfg(target_os = "macos")]
        let _ = app.set_activation_policy(tauri::ActivationPolicy::Regular);

        if self == &Self::Main {
            use tauri_plugin_analytics::{AnalyticsPayload, AnalyticsPluginExt};
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
            window.show()?;
            window.set_focus()?;
            return Ok(window);
        }

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
    fn close_all_windows(&self) -> Result<(), crate::Error>;
    fn handle_main_window_visibility(&self, visible: bool) -> Result<(), crate::Error>;

    fn window_show(&self, window: AppWindow) -> Result<WebviewWindow, crate::Error>;
    fn window_destroy(&self, window: AppWindow) -> Result<(), crate::Error>;

    fn window_emit_navigate(
        &self,
        window: AppWindow,
        event: events::Navigate,
    ) -> Result<(), crate::Error>;

    fn window_navigate(&self, window: AppWindow, path: impl AsRef<str>)
        -> Result<(), crate::Error>;
}

impl WindowsPluginExt<tauri::Wry> for AppHandle<tauri::Wry> {
    fn close_all_windows(&self) -> Result<(), crate::Error> {
        for (_, window) in self.webview_windows() {
            let _ = window.close();
        }
        Ok(())
    }

    fn handle_main_window_visibility(&self, visible: bool) -> Result<(), crate::Error> {
        let state = self.state::<crate::ManagedState>();
        let mut guard = state.lock().unwrap();

        let window_state = guard.windows.entry(AppWindow::Main).or_default();

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
                use tauri_plugin_analytics::{AnalyticsPayload, AnalyticsPluginExt};

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

    fn window_show(&self, window: AppWindow) -> Result<WebviewWindow, crate::Error> {
        window.show(self)
    }

    fn window_destroy(&self, window: AppWindow) -> Result<(), crate::Error> {
        window.destroy(self)
    }

    fn window_emit_navigate(
        &self,
        window: AppWindow,
        event: events::Navigate,
    ) -> Result<(), crate::Error> {
        window.emit_navigate(self, event)
    }

    fn window_navigate(
        &self,
        window: AppWindow,
        path: impl AsRef<str>,
    ) -> Result<(), crate::Error> {
        window.navigate(self, path)
    }
}
