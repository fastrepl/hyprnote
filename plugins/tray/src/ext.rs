use tauri::{
    image::Image,
    menu::{Menu, MenuId, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    AppHandle, Result,
};

pub enum TrayItem {
    Open,
    Start,
    Quit,
}

impl From<TrayItem> for MenuId {
    fn from(value: TrayItem) -> Self {
        match value {
            TrayItem::Open => "open_hypr",
            TrayItem::Start => "start_hypr",
            TrayItem::Quit => "quit_hypr",
        }
        .into()
    }
}

impl From<MenuId> for TrayItem {
    fn from(id: MenuId) -> Self {
        let id = id.0.as_str();
        match id {
            "open_hypr" => TrayItem::Open,
            "start_hypr" => TrayItem::Start,
            "quit_hypr" => TrayItem::Quit,
            _ => unreachable!(),
        }
    }
}

pub trait TrayPluginExt<R: tauri::Runtime> {
    fn create_tray(&self) -> Result<()>;
}

impl<T: tauri::Manager<tauri::Wry>> TrayPluginExt<tauri::Wry> for T {
    fn create_tray(&self) -> Result<()> {
        let app = self.app_handle();

        let menu = Menu::with_items(
            app,
            &[
                &open_menu(app)?,
                &start_menu(app)?,
                &PredefinedMenuItem::separator(app)?,
                &quit_menu(app)?,
            ],
        )?;

        TrayIconBuilder::with_id("hypr-tray")
            .icon(Image::from_bytes(include_bytes!(
                "../icons/tray_default.png"
            ))?)
            .icon_as_template(true)
            .menu(&menu)
            .show_menu_on_left_click(true)
            .on_menu_event({
                move |app: &AppHandle, event| match TrayItem::from(event.id.clone()) {
                    TrayItem::Open => {
                        use tauri_plugin_windows::HyprWindow;
                        let _ = HyprWindow::Main.show(app);
                    }
                    TrayItem::Start => {
                        use tauri_plugin_windows::{HyprWindow, WindowsPluginExt};
                        if let Ok(_) = app.window_show(HyprWindow::Main) {
                            let _ = app.window_navigate(HyprWindow::Main, "/app/new?record=true");
                        }
                    }
                    TrayItem::Quit => {
                        app.exit(0);
                    }
                }
            })
            .build(app)?;

        Ok(())
    }
}

fn open_menu<R: tauri::Runtime>(app: &AppHandle<R>) -> Result<MenuItem<R>> {
    MenuItem::with_id(app, TrayItem::Open, "Open Hyprnote", true, None::<&str>)
}

fn start_menu<R: tauri::Runtime>(app: &AppHandle<R>) -> Result<MenuItem<R>> {
    MenuItem::with_id(
        app,
        TrayItem::Start,
        "Start a new meeting",
        true,
        None::<&str>,
    )
}

fn quit_menu<R: tauri::Runtime>(app: &AppHandle<R>) -> Result<MenuItem<R>> {
    MenuItem::with_id(app, TrayItem::Quit, "Quit", true, Some("cmd+q"))
}
