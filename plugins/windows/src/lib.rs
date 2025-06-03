mod commands;
mod errors;
mod events;
mod ext;
mod overlay;

pub use errors::*;
pub use events::*;
pub use ext::*;
use overlay::*;
pub use overlay::{FakeWindowBounds, OverlayBound};

const PLUGIN_NAME: &str = "windows";

use tauri::Manager;
use std::sync::Mutex;
use once_cell::sync::Lazy;
use uuid::Uuid;

pub type ManagedState = std::sync::Mutex<State>;

static OVERLAY_JOIN_HANDLE: Lazy<Mutex<Option<tokio::task::JoinHandle<()>>>> = Lazy::new(|| Mutex::new(None));

pub fn set_overlay_join_handle(handle: tokio::task::JoinHandle<()>) {
    if let Ok(mut guard) = OVERLAY_JOIN_HANDLE.lock() {
        if let Some(old_handle) = guard.take() {
            old_handle.abort();
        }
        *guard = Some(handle);
    }
}

pub fn abort_overlay_join_handle() {
    if let Ok(mut guard) = OVERLAY_JOIN_HANDLE.lock() {
        if let Some(handle) = guard.take() {
            handle.abort();
        }
    }
}

pub struct WindowState {
    id: String,
    floating: bool,
    visible: bool,
}

impl Default for WindowState {
    fn default() -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            floating: false,
            visible: false,
        }
    }
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
            commands::window_close,
            commands::window_hide,
            commands::window_destroy,
            commands::window_position,
            commands::window_get_floating,
            commands::window_set_floating,
            commands::window_navigate,
            commands::window_emit_navigate,
            commands::window_is_visible,
            commands::window_set_overlay_bounds,
            commands::window_remove_overlay_bounds,
            commands::set_fake_window_bounds,
            commands::remove_fake_window,
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