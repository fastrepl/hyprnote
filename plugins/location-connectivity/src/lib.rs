mod commands;
mod error;
mod ext;
mod store;
mod types;

#[cfg(target_os = "macos")]
mod wifi_macos;

pub use error::*;
pub use ext::*;
pub use store::*;
pub use types::*;

use tauri::Manager;

const PLUGIN_NAME: &str = "location-connectivity";

fn make_specta_builder() -> tauri_specta::Builder<tauri::Wry> {
    tauri_specta::Builder::<tauri::Wry>::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![
            commands::get_current_ssid,
            commands::get_trusted_ssids,
            commands::add_trusted_ssid,
            commands::remove_trusted_ssid,
            commands::is_location_based_enabled,
            commands::set_location_based_enabled,
            commands::is_in_trusted_location,
            commands::get_location_status,
        ])
        .events(tauri_specta::collect_events![types::LocationEvent])
        .error_handling(tauri_specta::ErrorHandlingMode::Throw)
}

pub fn init() -> tauri::plugin::TauriPlugin<tauri::Wry> {
    let specta_builder = make_specta_builder();

    tauri::plugin::Builder::new(PLUGIN_NAME)
        .invoke_handler(specta_builder.invoke_handler())
        .setup(move |app_handle, _api| {
            specta_builder.mount_events(app_handle);
            let state = LocationConnectivityState::new(app_handle);
            app_handle.manage(state);
            
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