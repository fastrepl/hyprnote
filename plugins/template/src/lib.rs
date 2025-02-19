use std::sync::Mutex;
use tauri::{Manager, Runtime};

mod commands;
mod engine;

const PLUGIN_NAME: &str = "template";

pub struct State {
    env: minijinja::Environment<'static>,
}

impl Default for State {
    fn default() -> Self {
        Self {
            env: minijinja::Environment::new(),
        }
    }
}

fn make_specta_builder<R: Runtime>() -> tauri_specta::Builder<R> {
    tauri_specta::Builder::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![
            commands::render,
            commands::register_template
        ])
        .error_handling(tauri_specta::ErrorHandlingMode::Throw)
}

pub fn init<R: Runtime>() -> tauri::plugin::TauriPlugin<R> {
    let specta_builder = make_specta_builder();

    tauri::plugin::Builder::new(PLUGIN_NAME)
        .invoke_handler(specta_builder.invoke_handler())
        .setup(|app, _api| {
            let mut state = State::default();
            engine::init(&mut state.env);
            app.manage(Mutex::new(state));
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
                "./generated/bindings.ts",
            )
            .unwrap()
    }
}
