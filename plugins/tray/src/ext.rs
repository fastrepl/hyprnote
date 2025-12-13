use tauri::{
    AppHandle, Result,
    image::Image,
    menu::{Menu, MenuItemKind, PredefinedMenuItem},
    tray::TrayIconBuilder,
};

use crate::menu_items::{
    AppInfo, AppNew, HyprMenuItem, MenuItemHandler, TrayCheckUpdate, TrayOpen, TrayQuit,
    TraySettings, TrayStart, app_cli_menu,
};

const TRAY_ID: &str = "hypr-tray";

pub trait TrayPluginExt<R: tauri::Runtime> {
    fn create_app_menu(&self) -> Result<()>;
    fn create_tray_menu(&self) -> Result<()>;
    fn set_start_disabled(&self, disabled: bool) -> Result<()>;
}

impl<T: tauri::Manager<tauri::Wry>> TrayPluginExt<tauri::Wry> for T {
    fn create_app_menu(&self) -> Result<()> {
        let app = self.app_handle();

        let info_item = AppInfo::build(app)?;
        let check_update_item = TrayCheckUpdate::build(app)?;
        let settings_item = TraySettings::build(app)?;
        let cli_item = app_cli_menu(app)?;
        let new_item = AppNew::build(app)?;

        if cfg!(target_os = "macos")
            && let Some(menu) = app.menu()
        {
            let items = menu.items()?;

            if !items.is_empty()
                && let MenuItemKind::Submenu(submenu) = &items[0]
            {
                submenu.remove_at(0)?;
                submenu.remove_at(0)?;
                submenu.prepend(&cli_item)?;
                submenu.prepend(&settings_item)?;
                submenu.prepend(&check_update_item)?;
                submenu.prepend(&info_item)?;
            }

            if items.len() > 1
                && let MenuItemKind::Submenu(submenu) = &items[1]
            {
                submenu.prepend(&new_item)?;
            }
        }

        Ok(())
    }

    fn create_tray_menu(&self) -> Result<()> {
        let app = self.app_handle();

        let menu = Menu::with_items(
            app,
            &[
                &TrayOpen::build(app)?,
                &TrayStart::build_with_disabled(app, false)?,
                &PredefinedMenuItem::separator(app)?,
                &TrayCheckUpdate::build(app)?,
                &PredefinedMenuItem::separator(app)?,
                &TrayQuit::build(app)?,
            ],
        )?;

        TrayIconBuilder::with_id(TRAY_ID)
            .icon(Image::from_bytes(include_bytes!(
                "../icons/tray_default.png"
            ))?)
            .icon_as_template(true)
            .menu(&menu)
            .show_menu_on_left_click(true)
            .on_menu_event(move |app: &AppHandle, event| {
                HyprMenuItem::from(event.id.clone()).handle(app);
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
                    &TrayOpen::build(app)?,
                    &TrayStart::build_with_disabled(app, disabled)?,
                    &PredefinedMenuItem::separator(app)?,
                    &TrayCheckUpdate::build(app)?,
                    &PredefinedMenuItem::separator(app)?,
                    &TrayQuit::build(app)?,
                ],
            )?;

            tray.set_menu(Some(menu))?;
        }

        Ok(())
    }
}
