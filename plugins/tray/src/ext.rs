use tauri::{
    image::Image,
    menu::{Menu, MenuId, MenuItem, MenuItemKind, PredefinedMenuItem},
    tray::TrayIconBuilder,
    AppHandle, Manager, Result,
};

use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons};
use tauri_plugin_local_stt::LocalSttPluginExt;
use tauri_plugin_misc::MiscPluginExt;

// State for managing the blinking task
pub struct BlinkingState {
    handle: std::sync::Mutex<Option<std::thread::JoinHandle<()>>>,
    stop_flag: std::sync::Arc<std::sync::atomic::AtomicBool>,
    icon_default: Image<'static>,
    icon_recording: Image<'static>,
    blink_interval: std::time::Duration,
}

impl BlinkingState {
    pub fn new(
        icon_default: Image<'static>,
        icon_recording: Image<'static>,
        blink_interval: std::time::Duration,
    ) -> Self {
        Self {
            handle: std::sync::Mutex::new(None),
            stop_flag: std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false)),
            icon_default,
            icon_recording,
            blink_interval,
        }
    }

    pub fn icon_default(&self) -> &Image<'static> {
        &self.icon_default
    }

    pub fn icon_recording(&self) -> &Image<'static> {
        &self.icon_recording
    }

    pub fn blink_interval(&self) -> std::time::Duration {
        self.blink_interval
    }

    pub fn handle(&self) -> &std::sync::Mutex<Option<std::thread::JoinHandle<()>>> {
        &self.handle
    }

    pub fn stop_flag(&self) -> &std::sync::Arc<std::sync::atomic::AtomicBool> {
        &self.stop_flag
    }
}

const TRAY_ID: &str = "com.hyprnote.dev.tray";

pub enum HyprMenuItem {
    TrayOpen,
    TrayStart,
    TrayQuit,
    AppInfo,
    AppNew,
}

impl From<HyprMenuItem> for MenuId {
    fn from(value: HyprMenuItem) -> Self {
        match value {
            HyprMenuItem::TrayOpen => "hypr_tray_open",
            HyprMenuItem::TrayStart => "hypr_tray_start",
            HyprMenuItem::TrayQuit => "hypr_tray_quit",
            HyprMenuItem::AppInfo => "hypr_app_info",
            HyprMenuItem::AppNew => "hypr_app_new",
        }
        .into()
    }
}

impl From<MenuId> for HyprMenuItem {
    fn from(id: MenuId) -> Self {
        let id = id.0.as_str();
        match id {
            "hypr_tray_open" => HyprMenuItem::TrayOpen,
            "hypr_tray_start" => HyprMenuItem::TrayStart,
            "hypr_tray_quit" => HyprMenuItem::TrayQuit,
            "hypr_app_info" => HyprMenuItem::AppInfo,
            "hypr_app_new" => HyprMenuItem::AppNew,
            _ => unreachable!(),
        }
    }
}

pub trait TrayPluginExt<R: tauri::Runtime> {
    fn create_app_menu(&self) -> Result<()>;
    fn create_tray_menu(&self) -> Result<()>;
    fn set_start_disabled(&self, disabled: bool) -> Result<()>;
    fn set_tray_icon_recording(&self, recording: bool) -> Result<()>;
    fn start_tray_blinking(&self) -> Result<()>;
    fn stop_tray_blinking(&self) -> Result<()>;
}

impl<T: tauri::Manager<tauri::Wry>> TrayPluginExt<tauri::Wry> for T {
    fn create_app_menu(&self) -> Result<()> {
        let app = self.app_handle();

        let info_item = app_info_menu(app)?;
        let new_item = app_new_menu(app)?;

        if cfg!(target_os = "macos") {
            if let Some(menu) = app.menu() {
                let items = menu.items()?;

                if items.len() > 0 {
                    if let MenuItemKind::Submenu(submenu) = &items[0] {
                        submenu.remove_at(0)?;
                        submenu.prepend(&info_item)?;
                        return Ok(());
                    }
                }

                if items.len() > 1 {
                    if let MenuItemKind::Submenu(submenu) = &items[1] {
                        submenu.prepend(&new_item)?;
                        return Ok(());
                    }
                }
            }
        }

        Ok(())
    }

    fn create_tray_menu(&self) -> Result<()> {
        let app = self.app_handle();

        tracing::info!("Creating tray menu...");

        let menu = Menu::with_items(
            app,
            &[
                &tray_open_menu(app)?,
                &tray_start_menu(app, false)?,
                &PredefinedMenuItem::separator(app)?,
                &tray_quit_menu(app)?,
            ],
        )?;

        tracing::info!("Loading tray icon...");
        let icon_result = Image::from_bytes(include_bytes!("../icons/tray_default_noalpha.png"));

        match &icon_result {
            Ok(_) => tracing::info!("Tray icon loaded successfully"),
            Err(e) => tracing::error!("Failed to load tray icon: {:?}", e),
        }

        tracing::info!("Building tray icon with ID: {}", TRAY_ID);

        let tray_result = TrayIconBuilder::with_id(TRAY_ID)
            .icon(icon_result?)
            .icon_as_template(false)
            .tooltip("Hyprnote Recording Tool")
            .title("Hyprnote")
            .menu(&menu)
            .show_menu_on_left_click(true)
            .on_menu_event({
                move |app: &AppHandle, event| match HyprMenuItem::from(event.id.clone()) {
                    HyprMenuItem::TrayOpen => {
                        use tauri_plugin_windows::HyprWindow;
                        let _ = HyprWindow::Main.show(app);
                    }
                    HyprMenuItem::TrayStart => {
                        use tauri_plugin_windows::{HyprWindow, WindowsPluginExt};
                        if let Ok(_) = app.window_show(HyprWindow::Main) {
                            let _ =
                                app.window_emit_navigate(HyprWindow::Main, "/app/new?record=true");
                        }
                    }
                    HyprMenuItem::TrayQuit => {
                        app.exit(0);
                    }
                    HyprMenuItem::AppInfo => {
                        let app_name = app.package_info().name.clone();
                        let app_version = app.package_info().version.to_string();
                        let app_commit = app.get_git_hash();
                        let app_backends = app.list_ggml_backends();

                        let message = format!(
                            "{} v{}\n\nSHA: {}\n\nBackends: {}",
                            app_name,
                            app_version,
                            app_commit,
                            app_backends
                                .iter()
                                .map(|b| format!("{:?}", b))
                                .collect::<Vec<_>>()
                                .join("\n")
                        );

                        let app_clone = app.clone();

                        app.dialog()
                            .message(&message)
                            .title("About Hyprnote")
                            .buttons(MessageDialogButtons::OkCustom("Copy".to_string()))
                            .show(move |result| {
                                if result {
                                    let _ = app_clone.clipboard().write_text(&message);
                                }
                            });
                    }
                    HyprMenuItem::AppNew => {
                        use tauri_plugin_windows::{HyprWindow, WindowsPluginExt};
                        if let Ok(_) = app.window_show(HyprWindow::Main) {
                            let _ = app.window_emit_navigate(HyprWindow::Main, "/app/new");
                        }
                    }
                }
            })
            .build(app);

        match tray_result {
            Ok(tray_icon) => {
                tracing::info!("Tray icon created successfully with ID: {}", TRAY_ID);
                // Verify the tray was actually created
                if let Some(existing_tray) = app.tray_by_id(TRAY_ID) {
                    tracing::info!("Tray icon verification: found tray with ID {}", TRAY_ID);
                    // Try to force visibility
                    tracing::info!("Attempting to force tray icon visibility...");
                } else {
                    tracing::error!(
                        "Tray icon verification: could not find tray with ID {}",
                        TRAY_ID
                    );
                }

                // Log some additional info
                tracing::info!("Tray icon object created successfully");
                Ok(())
            }
            Err(e) => {
                tracing::error!("Failed to create tray icon: {:?}", e);
                Err(e.into())
            }
        }
    }

    fn set_start_disabled(&self, disabled: bool) -> Result<()> {
        let app = self.app_handle();

        if let Some(tray) = app.tray_by_id(TRAY_ID) {
            let menu = Menu::with_items(
                app,
                &[
                    &tray_open_menu(app)?,
                    &tray_start_menu(app, disabled)?,
                    &PredefinedMenuItem::separator(app)?,
                    &tray_quit_menu(app)?,
                ],
            )?;

            tray.set_menu(Some(menu))?;
        }

        Ok(())
    }

    fn set_tray_icon_recording(&self, recording: bool) -> Result<()> {
        let app = self.app_handle();

        if let Some(tray) = app.tray_by_id(TRAY_ID) {
            if let Some(state) = app.try_state::<BlinkingState>() {
                let icon = if recording {
                    state.icon_recording()
                } else {
                    state.icon_default()
                };

                tray.set_icon(Some(icon.clone()))?;
                // tray.set_icon_as_template(false)?; // Disabled for debugging
            } else {
                // Fallback to loading icons directly if state not available
                let icon = if recording {
                    Image::from_bytes(include_bytes!("../icons/tray_recording.png"))?
                } else {
                    Image::from_bytes(include_bytes!("../icons/tray_default_noalpha.png"))?
                };

                tray.set_icon(Some(icon))?;
                // tray.set_icon_as_template(false)?; // Disabled for debugging
            }
        }

        Ok(())
    }

    fn start_tray_blinking(&self) -> Result<()> {
        let app_handle = self.app_handle();

        let state = app_handle.state::<BlinkingState>();

        state
            .stop_flag()
            .store(true, std::sync::atomic::Ordering::Relaxed);
        if let Some(handle) = state.handle().lock().unwrap().take() {
            let _ = handle.join();
        }

        // Start new blinking task
        let app_clone = app_handle.clone();
        state
            .stop_flag()
            .store(false, std::sync::atomic::Ordering::Relaxed);
        let stop_flag = state.stop_flag().clone();

        let icon_default = state.icon_default().clone();
        let icon_recording = state.icon_recording().clone();
        let blink_interval = state.blink_interval();

        let handle = std::thread::spawn(move || {
            let mut is_recording_icon = true;
            let mut last_blink = std::time::Instant::now();

            loop {
                if stop_flag.load(std::sync::atomic::Ordering::Relaxed) {
                    break;
                }

                let now = std::time::Instant::now();
                if now.duration_since(last_blink) >= blink_interval {
                    if let Some(tray) = app_clone.tray_by_id(TRAY_ID) {
                        let icon = if is_recording_icon {
                            &icon_default
                        } else {
                            &icon_recording
                        };
                        let _ = tray.set_icon(Some(icon.clone()));
                        // let _ = tray.set_icon_as_template(false); // Disabled for debugging
                    }
                    is_recording_icon = !is_recording_icon;
                    last_blink = now;
                }

                // Short sleep to prevent busy waiting
                std::thread::sleep(std::time::Duration::from_millis(10));
            }
        });

        let mut guard = state.handle().lock().unwrap();
        *guard = Some(handle);

        Ok(())
    }

    fn stop_tray_blinking(&self) -> Result<()> {
        let app = self.app_handle();

        // Stop the blinking task
        let state = app.state::<BlinkingState>();
        state
            .stop_flag()
            .store(true, std::sync::atomic::Ordering::Relaxed);
        if let Some(handle) = state.handle().lock().unwrap().take() {
            let _ = handle.join();
        }

        // Set to default icon
        self.set_tray_icon_recording(false)?;

        Ok(())
    }
}

fn app_info_menu<R: tauri::Runtime>(app: &AppHandle<R>) -> Result<MenuItem<R>> {
    MenuItem::with_id(
        app,
        HyprMenuItem::AppInfo,
        "About Hyprnote",
        true,
        None::<&str>,
    )
}

fn app_new_menu<R: tauri::Runtime>(app: &AppHandle<R>) -> Result<MenuItem<R>> {
    MenuItem::with_id(
        app,
        HyprMenuItem::AppNew,
        "New Note",
        true,
        Some("CmdOrCtrl+N"),
    )
}

fn tray_open_menu<R: tauri::Runtime>(app: &AppHandle<R>) -> Result<MenuItem<R>> {
    MenuItem::with_id(
        app,
        HyprMenuItem::TrayOpen,
        "Open Hyprnote",
        true,
        None::<&str>,
    )
}

fn tray_start_menu<R: tauri::Runtime>(app: &AppHandle<R>, disabled: bool) -> Result<MenuItem<R>> {
    MenuItem::with_id(
        app,
        HyprMenuItem::TrayStart,
        "Start a new meeting",
        !disabled,
        None::<&str>,
    )
}

fn tray_quit_menu<R: tauri::Runtime>(app: &AppHandle<R>) -> Result<MenuItem<R>> {
    MenuItem::with_id(app, HyprMenuItem::TrayQuit, "Quit", true, Some("cmd+q"))
}
