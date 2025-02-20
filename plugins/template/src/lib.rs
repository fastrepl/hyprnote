use std::sync::Mutex;
use tauri::{Manager, Wry};

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

fn make_specta_builder() -> tauri_specta::Builder<Wry> {
    tauri_specta::Builder::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![
            commands::render::<Wry>,
            commands::register_template::<Wry>,
        ])
        .error_handling(tauri_specta::ErrorHandlingMode::Throw)
}

pub fn init() -> tauri::plugin::TauriPlugin<Wry> {
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

pub trait TemplatePluginExt<R: tauri::Runtime> {
    fn render(
        &self,
        name: impl AsRef<str>,
        ctx: serde_json::Map<String, serde_json::Value>,
    ) -> Result<String, String>;
    fn register_template(
        &self,
        name: impl Into<String>,
        template: impl Into<String>,
    ) -> Result<(), String>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> crate::TemplatePluginExt<R> for T {
    fn render(
        &self,
        name: impl AsRef<str>,
        ctx: serde_json::Map<String, serde_json::Value>,
    ) -> Result<String, String> {
        let state = self.state::<Mutex<State>>();
        let s = state.lock().unwrap();
        let tpl = s
            .env
            .get_template(name.as_ref())
            .map_err(|e| e.to_string())?;
        tpl.render(&ctx).map_err(|e| e.to_string())
    }

    fn register_template(
        &self,
        name: impl Into<String>,
        template: impl Into<String>,
    ) -> Result<(), String> {
        let state = self.state::<Mutex<State>>();
        let mut state = state.lock().unwrap();
        state
            .env
            .add_template_owned(name.into(), template.into())
            .map_err(|e| e.to_string())
    }
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
