use tauri::{
    AppHandle, Result,
    image::Image,
    menu::{Menu, MenuItemKind, PredefinedMenuItem, Submenu},
    tray::TrayIconBuilder,
};

use crate::menu_items::{
    AppInfo, AppNew, HelpReportBug, HelpSuggestFeature, HyprMenuItem, MenuItemHandler,
    TrayCheckUpdate, TrayOpen, TrayQuit, TraySettings, TrayStart, TrayVersion, app_cli_menu,
};

const TRAY_ID: &str = "hypr-tray";

#[cfg(target_os = "macos")]
mod icon_helpers {
    use objc2::AnyThread;
    use objc2::rc::Retained;
    use objc2_app_kit::{NSBezierPath, NSColor, NSImage};
    use objc2_foundation::{NSData, NSPoint, NSRect, NSSize};

    pub fn bytes_to_image(bytes: &[u8]) -> Option<Retained<NSImage>> {
        let ns_data = NSData::with_bytes(bytes);
        NSImage::initWithData(NSImage::alloc(), &ns_data)
    }

    pub fn image_to_png_bytes(image: &NSImage) -> Option<Vec<u8>> {
        use objc2::msg_send;
        use objc2_app_kit::{NSBitmapImageFileType, NSBitmapImageRep};

        unsafe {
            let size = image.size();
            let mut rect = NSRect::new(NSPoint::new(0.0, 0.0), size);
            let Some(cgimage) = image.CGImageForProposedRect_context_hints(
                &mut rect as *mut NSRect as *mut _,
                None,
                None,
            ) else {
                return None;
            };

            let bitmap = NSBitmapImageRep::initWithCGImage(NSBitmapImageRep::alloc(), &cgimage);

            let Some(png_data) = bitmap.representationUsingType_properties(
                NSBitmapImageFileType::PNG,
                &objc2_foundation::NSDictionary::new(),
            ) else {
                return None;
            };

            let len: usize = msg_send![&*png_data, length];
            let ptr: *const u8 = msg_send![&*png_data, bytes];
            let slice = std::slice::from_raw_parts(ptr, len);
            Some(slice.to_vec())
        }
    }

    #[allow(deprecated)]
    pub fn draw_download_overlay(base_image: &NSImage) -> Retained<NSImage> {
        let size = base_image.size();
        let composite_image = NSImage::initWithSize(NSImage::alloc(), size);

        composite_image.lockFocus();

        base_image.drawAtPoint_fromRect_operation_fraction(
            NSPoint::new(0.0, 0.0),
            NSRect::new(NSPoint::new(0.0, 0.0), size),
            objc2_app_kit::NSCompositingOperation::Copy,
            1.0,
        );

        let indicator_size = size.width * 0.4;
        let indicator_x = size.width - indicator_size - (size.width * 0.02);
        let indicator_y = size.height * 0.02;

        let white_color = NSColor::whiteColor();
        white_color.setFill();

        let bg_rect = NSRect::new(
            NSPoint::new(indicator_x, indicator_y),
            NSSize::new(indicator_size, indicator_size),
        );
        let bg_path = NSBezierPath::bezierPathWithOvalInRect(bg_rect);
        bg_path.fill();

        let black_color = NSColor::blackColor();
        black_color.setFill();

        let arrow_center_x = indicator_x + indicator_size / 2.0;
        let arrow_center_y = indicator_y + indicator_size / 2.0;
        let arrow_size = indicator_size * 0.5;

        let arrow_path = NSBezierPath::bezierPath();
        arrow_path.moveToPoint(NSPoint::new(
            arrow_center_x,
            arrow_center_y - arrow_size * 0.4,
        ));
        arrow_path.lineToPoint(NSPoint::new(
            arrow_center_x - arrow_size * 0.35,
            arrow_center_y + arrow_size * 0.1,
        ));
        arrow_path.lineToPoint(NSPoint::new(
            arrow_center_x - arrow_size * 0.15,
            arrow_center_y + arrow_size * 0.1,
        ));
        arrow_path.lineToPoint(NSPoint::new(
            arrow_center_x - arrow_size * 0.15,
            arrow_center_y + arrow_size * 0.4,
        ));
        arrow_path.lineToPoint(NSPoint::new(
            arrow_center_x + arrow_size * 0.15,
            arrow_center_y + arrow_size * 0.4,
        ));
        arrow_path.lineToPoint(NSPoint::new(
            arrow_center_x + arrow_size * 0.15,
            arrow_center_y + arrow_size * 0.1,
        ));
        arrow_path.lineToPoint(NSPoint::new(
            arrow_center_x + arrow_size * 0.35,
            arrow_center_y + arrow_size * 0.1,
        ));
        arrow_path.closePath();
        arrow_path.fill();

        composite_image.unlockFocus();

        composite_image
    }
}

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
        let report_bug_item = HelpReportBug::build(app)?;
        let suggest_feature_item = HelpSuggestFeature::build(app)?;

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

            for item in &items {
                if let MenuItemKind::Submenu(submenu) = item
                    && submenu.text()? == "Help"
                {
                    menu.remove(submenu)?;
                    break;
                }
            }

            let help_submenu = Submenu::with_items(
                app,
                "Help",
                true,
                &[&report_bug_item, &suggest_feature_item],
            )?;
            menu.append(&help_submenu)?;
        }

        Ok(())
    }

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
                // Tauri dispatches menu events globally, so we receive events from context menus
                // created elsewhere. TryFrom gracefully ignores unknown menu IDs that don't belong to the tray menu.
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

    pub fn set_download_indicator(&self, show: bool) -> Result<()> {
        #[cfg(target_os = "macos")]
        {
            let app = self.manager.app_handle();

            if let Some(tray) = app.tray_by_id(TRAY_ID) {
                let icon_bytes = if show {
                    let base_bytes = include_bytes!("../icons/tray_default.png");
                    let Some(base_image) = icon_helpers::bytes_to_image(base_bytes) else {
                        return Ok(());
                    };
                    let composite_image = icon_helpers::draw_download_overlay(&base_image);
                    let Some(png_bytes) = icon_helpers::image_to_png_bytes(&composite_image) else {
                        return Ok(());
                    };
                    png_bytes
                } else {
                    include_bytes!("../icons/tray_default.png").to_vec()
                };

                let icon = Image::from_bytes(&icon_bytes)?;
                tray.set_icon(Some(icon))?;
            }

            Ok(())
        }

        #[cfg(not(target_os = "macos"))]
        {
            let _ = show;
            Ok(())
        }
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
