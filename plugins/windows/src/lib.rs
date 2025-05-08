mod commands;
mod errors;
mod events;
mod ext;
mod overlay;

pub use errors::*;
pub use events::*;
pub use ext::*;
use overlay::*;

const PLUGIN_NAME: &str = "windows";

use tauri::Manager;

pub type ManagedState = std::sync::Mutex<State>;

#[derive(Default)]
pub struct WindowState {
    floating: bool,
}

#[derive(Default)]
pub struct State {
    windows: std::collections::HashMap<HyprWindow, WindowState>,
}

fn make_specta_builder() -> tauri_specta::Builder<tauri::Wry> {
    tauri_specta::Builder::<tauri::Wry>::new()
        .plugin_name(PLUGIN_NAME)
        .events(tauri_specta::collect_events![
            events::Navigate,
            events::WindowDestroyed,
            events::MainWindowState,
        ])
        .commands(tauri_specta::collect_commands![
            commands::window_show,
            commands::window_destroy,
            commands::window_position,
            commands::window_get_floating,
            commands::window_set_floating,
            commands::window_navigate,
            commands::window_emit_navigate,
            commands::window_is_visible,
            commands::window_set_overlay_bounds,
            commands::window_remove_overlay_bounds,
        ])
        .error_handling(tauri_specta::ErrorHandlingMode::Throw)
}

pub fn init() -> tauri::plugin::TauriPlugin<tauri::Wry> {
    let specta_builder = make_specta_builder();

    tauri::plugin::Builder::new(PLUGIN_NAME)
        .invoke_handler(specta_builder.invoke_handler())
        .setup(move |app, _api| {
            specta_builder.mount_events(app);

            {
                let state = ManagedState::default();
                app.manage(state);
            }

            {
                let state = OverlayState::default();
                app.manage(state);
            }

            Ok(())
        })
        .build()
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn export_types() {
        make_specta_builder()
            .export(
                specta_typescript::Typescript::default()
                    .header("// @ts-nocheck\n\n")
                    .formatter(specta_typescript::formatter::prettier)
                    .bigint(specta_typescript::BigIntExportBehavior::Number),
                "./js/bindings.gen.ts",
            )
            .unwrap()
    }
}
