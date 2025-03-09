use std::sync::Mutex;
use tauri::{Manager, Wry};

mod commands;
mod engine;
mod ext;

pub use ext::TemplatePluginExt;

const PLUGIN_NAME: &str = "hypr-template";

pub type ManagedState = Mutex<State>;

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

fn make_specta_builder<R: tauri::Runtime>() -> tauri_specta::Builder<R> {
    tauri_specta::Builder::<R>::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![
            commands::render::<Wry>,
            commands::register_template::<Wry>,
        ])
        .error_handling(tauri_specta::ErrorHandlingMode::Throw)
}

pub fn init<R: tauri::Runtime>() -> tauri::plugin::TauriPlugin<R> {
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
                "./js/bindings.gen.ts",
            )
            .unwrap()
    }

    fn create_app<R: tauri::Runtime>(builder: tauri::Builder<R>) -> tauri::App<R> {
        builder
            .plugin(init())
            .build(tauri::test::mock_context(tauri::test::noop_assets()))
            .unwrap()
    }

    #[test]
    fn test_template() {
        let _app = create_app(tauri::test::mock_builder());
    }
}
