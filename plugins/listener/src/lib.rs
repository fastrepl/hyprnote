use ractor::Actor;
use tauri::Manager;

mod actors;
mod commands;
mod error;
mod events;
mod ext;
pub mod fsm;

pub use error::*;
pub use events::*;
pub use ext::*;

use actors::{RootActor, RootArgs, SourceActor};

const PLUGIN_NAME: &str = "listener";

fn make_specta_builder<R: tauri::Runtime>() -> tauri_specta::Builder<R> {
    tauri_specta::Builder::<R>::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![
            commands::list_microphone_devices::<tauri::Wry>,
            commands::get_current_microphone_device::<tauri::Wry>,
            commands::get_mic_muted::<tauri::Wry>,
            commands::set_mic_muted::<tauri::Wry>,
            commands::start_session::<tauri::Wry>,
            commands::stop_session::<tauri::Wry>,
            commands::get_state::<tauri::Wry>,
            commands::is_supported_languages::<tauri::Wry>,
            commands::suggest_providers_for_languages::<tauri::Wry>,
        ])
        .events(tauri_specta::collect_events![
            SessionLifecycleEvent,
            SessionProgressEvent,
            SessionErrorEvent,
            SessionDataEvent
        ])
        .error_handling(tauri_specta::ErrorHandlingMode::Result)
}

pub fn init() -> tauri::plugin::TauriPlugin<tauri::Wry> {
    let specta_builder = make_specta_builder();

    tauri::plugin::Builder::new(PLUGIN_NAME)
        .invoke_handler(specta_builder.invoke_handler())
        .setup(move |app, _api| {
            specta_builder.mount_events(app);

            let app_handle = app.app_handle().clone();

            tauri::async_runtime::spawn(async move {
                match Actor::spawn(
                    Some(RootActor::name()),
                    RootActor,
                    RootArgs { app: app_handle },
                )
                .await
                {
                    Ok(_) => {
                        tracing::info!("root_actor_spawned");
                    }
                    Err(e) => {
                        tracing::error!(?e, "failed_to_spawn_root_actor");
                    }
                }
            });

            Ok(())
        })
        .on_event(move |_app, event| {
            if let tauri::RunEvent::Ready = event {
                hypr_intercept::register_quit_handler(PLUGIN_NAME, || {
                    ractor::registry::where_is(SourceActor::name()).is_none()
                });
            }
        })
        .on_drop(|_app| {
            hypr_intercept::unregister_quit_handler(PLUGIN_NAME);
            if let Some(cell) = ractor::registry::where_is(RootActor::name()) {
                cell.stop(None);
            }
        })
        .build()
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn export_types() {
        const OUTPUT_FILE: &str = "./js/bindings.gen.ts";

        make_specta_builder::<tauri::Wry>()
            .export(
                specta_typescript::Typescript::default()
                    .formatter(specta_typescript::formatter::prettier)
                    .bigint(specta_typescript::BigIntExportBehavior::Number),
                OUTPUT_FILE,
            )
            .unwrap();

        let content = std::fs::read_to_string(OUTPUT_FILE).unwrap();
        std::fs::write(OUTPUT_FILE, format!("// @ts-nocheck\n{content}")).unwrap();
    }
}
