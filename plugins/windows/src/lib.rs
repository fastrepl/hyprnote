mod commands;
mod errors;
mod events;
mod ext;
mod overlay;
mod window;

pub use errors::*;
pub use events::*;
pub use ext::*;
pub use window::*;

pub use overlay::{FakeWindowBounds, OverlayBound};

const PLUGIN_NAME: &str = "windows";

use tauri::Manager;
use uuid::Uuid;

pub type ManagedState = std::sync::Mutex<State>;

pub struct WindowState {
    id: String,
    visible: bool,
}

impl Default for WindowState {
    fn default() -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            visible: false,
        }
    }
}

#[derive(Default)]
pub struct State {
    windows: std::collections::HashMap<AppWindow, WindowState>,
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
            commands::window_navigate,
            commands::window_emit_navigate,
            commands::window_is_exists,
            commands::set_fake_window_bounds,
            commands::remove_fake_window,
        ])
        .error_handling(tauri_specta::ErrorHandlingMode::Result)
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
                let fake_bounds_state = FakeWindowBounds::default();
                app.manage(fake_bounds_state);
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
        const OUTPUT_FILE: &str = "./js/bindings.gen.ts";

        make_specta_builder()
            .export(
                specta_typescript::Typescript::default()
                    .header("// @ts-nocheck\n\n")
                    .formatter(specta_typescript::formatter::prettier)
                    .bigint(specta_typescript::BigIntExportBehavior::Number),
                OUTPUT_FILE,
            )
            .unwrap()
    }
}
