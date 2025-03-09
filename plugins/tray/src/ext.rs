use tauri::{
    image::Image,
    menu::{Menu, MenuId, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    AppHandle, Manager, Result,
};

pub enum TrayItem {
    Open,
    Quit,
    AlwaysOnTop,
}

impl From<TrayItem> for MenuId {
    fn from(value: TrayItem) -> Self {
        match value {
            TrayItem::Open => "open_hypr",
            TrayItem::Quit => "quit_hypr",
            TrayItem::AlwaysOnTop => "always_on_top",
        }
        .into()
    }
}

impl From<MenuId> for TrayItem {
    fn from(id: MenuId) -> Self {
        let id = id.0.as_str();
        match id {
            "open_hypr" => TrayItem::Open,
            "quit_hypr" => TrayItem::Quit,
            "always_on_top" => TrayItem::AlwaysOnTop,
            _ => unreachable!(),
        }
    }
}

pub trait TrayPluginExt<R: tauri::Runtime> {
    fn create_tray(&self) -> Result<()>;
}

fn get_menu<R: tauri::Runtime>(app: &AppHandle<R>, always_on_top: bool) -> Result<Menu<R>> {
    Menu::with_items(
        app,
        &[
            &MenuItem::with_id(
                app,
                TrayItem::AlwaysOnTop,
                format!(
                    "Always on top ({})",
                    if always_on_top { "ON" } else { "OFF" }
                ),
                true,
                None::<&str>,
            )?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, TrayItem::Open, "Open", true, None::<&str>)?,
            &MenuItem::with_id(app, TrayItem::Quit, "Quit", true, None::<&str>)?,
        ],
    )
}

impl<T: tauri::Manager<tauri::Wry>> TrayPluginExt<tauri::Wry> for T {
    fn create_tray(&self) -> Result<()> {
        let app = self.app_handle();

        let menu = get_menu(app, false)?;

        TrayIconBuilder::with_id("hypr-tray")
            .icon(Image::from_bytes(include_bytes!(
                "../icons/tray_default.png"
            ))?)
            .icon_as_template(true)
            .menu(&menu)
            .show_menu_on_left_click(true)
            .on_menu_event(|app, event| match TrayItem::from(event.id) {
                TrayItem::Open => {
                    if let Some(window) = app.get_webview_window("main") {
                        window.show().unwrap();
                        window.set_focus().unwrap();
                    }
                }
                TrayItem::Quit => {
                    app.exit(0);
                }
                TrayItem::AlwaysOnTop => {
                    println!("always on top 1");
                    // TODO: at this poit, since we call create_tray inside setup, state is not managed.
                    let state = app.state::<crate::SharedState>();
                    println!("always on top 2");
                    let mut guard = state.lock().unwrap();
                    println!("always on top 3");
                    let previous = guard.always_on_top.unwrap_or(false);
                    let next = !previous;

                    use tauri_plugin_windows::WindowsPluginExt;
                    app.set_always_on_top(next).unwrap();
                    guard.always_on_top = Some(next);

                    {
                        let menu = get_menu(app, next).unwrap();
                        app.set_menu(menu).unwrap();
                    }
                }
            })
            .on_tray_icon_event({
                let _app_handle = app.clone();
                move |_tray, _event| {}
            })
            .build(app)?;

        Ok(())
    }
}
