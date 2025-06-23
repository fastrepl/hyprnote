use tauri::{
    image::Image,
    menu::{Menu, MenuId, MenuItem, MenuItemKind, PredefinedMenuItem},
    tray::TrayIconBuilder,
    AppHandle, Result,
};

use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons};
use tauri_plugin_local_stt::LocalSttPluginExt;
use tauri_plugin_misc::MiscPluginExt;

const TRAY_ID: &str = "hypr-tray";

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

        let menu = Menu::with_items(
            app,
            &[
                &tray_open_menu(app)?,
                &tray_start_menu(app, false)?,
                &PredefinedMenuItem::separator(app)?,
                &tray_quit_menu(app)?,
            ],
        )?;

        TrayIconBuilder::with_id(TRAY_ID)
            .icon(Image::from_bytes(include_bytes!(
                "../icons/tray_default.png"
            ))?)
            .icon_as_template(true)
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
                            .message(&app_name)
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
            .build(app)?;

        Ok(())
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
