// https://github.com/CapSoftware/Cap/blob/8671050aaff780f658507579e7d1d75e7ee25d59/apps/desktop/src-tauri/src/tray.rs

// use crate::events::{RecordingStarted, RecordingStopped};
use tauri::{
    image::Image,
    menu::{Menu, MenuId, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    AppHandle, Manager, Result,
};
// use tauri_specta::Event;

pub enum TrayItem {
    Open,
    Quit,
}

impl From<TrayItem> for MenuId {
    fn from(value: TrayItem) -> Self {
        match value {
            TrayItem::Open => "open_hypr",
            TrayItem::Quit => "quit_hypr",
        }
        .into()
    }
}

impl From<MenuId> for TrayItem {
    fn from(value: MenuId) -> Self {
        match value.0.as_str() {
            "open_hypr" => TrayItem::Open,
            "quit_hypr" => TrayItem::Quit,
            _ => unreachable!(),
        }
    }
}

pub fn create_tray(app: &AppHandle) -> Result<()> {
    let menu = Menu::with_items(
        app,
        &[
            &MenuItem::with_id(app, TrayItem::Open, "Open", true, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, TrayItem::Quit, "Quit", true, None::<&str>)?,
        ],
    )?;

    let app = app.clone();

    TrayIconBuilder::with_id("hypr-tray")
        .icon(Image::from_bytes(include_bytes!(
            "../icons/tray_default.png"
        ))?)
        .icon_as_template(true)
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event({
            move |app: &AppHandle, event| match TrayItem::from(event.id) {
                TrayItem::Open => {
                    if let Some(window) = app.get_webview_window("main") {
                        window.show().unwrap();
                        window.set_focus().unwrap();
                    }
                }
                TrayItem::Quit => {
                    app.exit(0);
                }
            }
        })
        .on_tray_icon_event({
            let app_handle = app.clone();
            move |tray, event| {}
        })
        .build(&app)
        .unwrap();

    // RecordingStarted::listen_any(&app, {
    //     let app = app.clone();
    //     move |_| {}
    // });

    // RecordingStopped::listen_any(&app, {
    //     let app = app.clone();
    //     move |_| {}
    // });

    Ok(())
}
