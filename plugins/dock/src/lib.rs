#[cfg(target_os = "macos")]
mod ext;

const PLUGIN_NAME: &str = "dock";

pub fn init() -> tauri::plugin::TauriPlugin<tauri::Wry> {
    tauri::plugin::Builder::<tauri::Wry>::new(PLUGIN_NAME)
        .setup(|_app, _api| {
            #[cfg(target_os = "macos")]
            ext::setup_dock_menu(_app)?;

            Ok(())
        })
        .build()
}
