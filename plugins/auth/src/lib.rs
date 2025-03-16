use tauri::Manager;

mod commands;
mod error;
mod events;
mod ext;
mod store;
mod vault;

pub use error::*;
pub use events::*;
pub use ext::*;
pub use store::*;
pub use vault::*;

pub use hypr_auth_interface::{RequestParams, ResponseParams};

const PLUGIN_NAME: &str = "auth";

const CALLBACK_TEMPLATE_KEY: &str = "callback";
const CALLBACK_TEMPLATE_VALUE: &str = include_str!("../templates/callback.jinja");

fn make_specta_builder<R: tauri::Runtime>() -> tauri_specta::Builder<R> {
    tauri_specta::Builder::<R>::new()
        .plugin_name(PLUGIN_NAME)
        .events(tauri_specta::collect_events![events::AuthEvent])
        .commands(tauri_specta::collect_commands![
            commands::start_oauth_server::<tauri::Wry>,
            commands::stop_oauth_server::<tauri::Wry>,
            commands::reset_vault::<tauri::Wry>,
            commands::get_from_vault::<tauri::Wry>,
            commands::get_from_store::<tauri::Wry>,
        ])
        .typ::<RequestParams>()
        .typ::<ResponseParams>()
        .error_handling(tauri_specta::ErrorHandlingMode::Throw)
}

pub fn init<R: tauri::Runtime>() -> tauri::plugin::TauriPlugin<R> {
    let specta_builder = make_specta_builder();

    tauri::plugin::Builder::new(PLUGIN_NAME)
        .invoke_handler(specta_builder.invoke_handler())
        .setup(move |app, _api| {
            specta_builder.mount_events(app);

            let mut env = minijinja::Environment::new();
            env.add_template(CALLBACK_TEMPLATE_KEY, CALLBACK_TEMPLATE_VALUE)
                .unwrap();

            app.manage(env);
            app.manage(Vault::default());

            Ok(())
        })
        .build()
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn export_types() {
        make_specta_builder::<tauri::Wry>()
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
