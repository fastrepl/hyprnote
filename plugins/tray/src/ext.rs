use tauri::{
    AppHandle, Result,
    image::Image,
    menu::{Menu, MenuItemKind, PredefinedMenuItem, Submenu},
    tray::TrayIconBuilder,
};

#[cfg(target_os = "macos")]
use tauri::tray::{MouseButton, MouseButtonState, TrayIconEvent};

use crate::menu_items::{
    AppInfo, AppNew, HyprMenuItem, MenuItemHandler, TrayCheckUpdate, TrayOpen, TrayQuit,
    TraySettings, TrayStart, TrayVersion, app_cli_menu,
};

#[cfg(target_os = "macos")]
use crate::panel::{MenubarPanel, position_panel_at_tray_icon};

const TRAY_ID: &str = "hypr-tray";

pub struct Tray<'a, R: tauri::Runtime, M: tauri::Manager<R>> {
    manager: &'a M,
    _runtime: std::marker::PhantomData<fn() -> R>,
}

impl<'a, M: tauri::Manager<tauri::Wry>> Tray<'a, tauri::Wry, M> {
    pub fn create_app_menu(&self) -> Result<()> {
        let app = self.manager.app_handle();

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
                && let MenuItemKind::Submenu(old_submenu) = &items[0]
            {
                let app_name = old_submenu.text()?;

                let new_app_submenu = Submenu::with_items(
                    app,
                    &app_name,
                    true,
                    &[
                        &info_item,
                        &check_update_item,
                        &settings_item,
                        &cli_item,
                        &PredefinedMenuItem::separator(app)?,
                        &PredefinedMenuItem::services(app, None)?,
                        &PredefinedMenuItem::separator(app)?,
                        &PredefinedMenuItem::hide(app, None)?,
                        &PredefinedMenuItem::hide_others(app, None)?,
                        &PredefinedMenuItem::show_all(app, None)?,
                        &PredefinedMenuItem::separator(app)?,
                        &PredefinedMenuItem::quit(app, None)?,
                    ],
                )?;

                menu.remove(old_submenu)?;
                menu.prepend(&new_app_submenu)?;
            }

            if items.len() > 1
                && let MenuItemKind::Submenu(submenu) = &items[1]
            {
                submenu.prepend(&new_item)?;
            }
        }

        Ok(())
    }

    #[cfg(target_os = "macos")]
    pub fn create_tray_menu(&self) -> Result<()> {
        let app = self.manager.app_handle();

        let menu = Menu::with_items(
            app,
            &[
                &TrayOpen::build(app)?,
                &TrayStart::build_with_disabled(app, false)?,
                &PredefinedMenuItem::separator(app)?,
                &TrayCheckUpdate::build(app)?,
                &PredefinedMenuItem::separator(app)?,
                &TrayQuit::build(app)?,
                &PredefinedMenuItem::separator(app)?,
                &TrayVersion::build(app)?,
            ],
        )?;

        TrayIconBuilder::with_id(TRAY_ID)
            .icon(Image::from_bytes(include_bytes!(
                "../icons/tray_default.png"
            ))?)
            .icon_as_template(true)
            .menu(&menu)
            .show_menu_on_left_click(false)
            .on_menu_event(move |app: &AppHandle, event| {
                if let Ok(item) = HyprMenuItem::try_from(event.id.clone()) {
                    item.handle(app);
                }
            })
            .on_tray_icon_event(|tray, event| {
                if let TrayIconEvent::Click {
                    button: MouseButton::Left,
                    button_state: MouseButtonState::Up,
                    rect,
                    ..
                } = event
                {
                    let app = tray.app_handle();
                    crate::panel::toggle_panel(app, rect);
                }
            })
            .build(app)?;

        Ok(())
    }

    #[cfg(not(target_os = "macos"))]
    pub fn create_tray_menu(&self) -> Result<()> {
        let app = self.manager.app_handle();

        let menu = Menu::with_items(
            app,
            &[
                &TrayOpen::build(app)?,
                &TrayStart::build_with_disabled(app, false)?,
                &PredefinedMenuItem::separator(app)?,
                &TrayCheckUpdate::build(app)?,
                &PredefinedMenuItem::separator(app)?,
                &TrayQuit::build(app)?,
                &PredefinedMenuItem::separator(app)?,
                &TrayVersion::build(app)?,
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
                if let Ok(item) = HyprMenuItem::try_from(event.id.clone()) {
                    item.handle(app);
                }
            })
            .build(app)?;

        Ok(())
    }

    pub fn set_start_disabled(&self, disabled: bool) -> Result<()> {
        let app = self.manager.app_handle();

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
                    &PredefinedMenuItem::separator(app)?,
                    &TrayVersion::build(app)?,
                ],
            )?;

            tray.set_menu(Some(menu))?;
        }

        Ok(())
    }
}

pub trait TrayPluginExt<R: tauri::Runtime> {
    fn tray(&self) -> Tray<'_, R, Self>
    where
        Self: tauri::Manager<R> + Sized;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> TrayPluginExt<R> for T {
    fn tray(&self) -> Tray<'_, R, Self>
    where
        Self: Sized,
    {
        Tray {
            manager: self,
            _runtime: std::marker::PhantomData,
        }
    }
}
