use tauri::{Manager, Wry};

mod commands;
mod error;
mod model;

pub use error::{Error, Result};

pub type SharedState = std::sync::Mutex<State>;

#[derive(Default)]
pub struct State {
    pub model: Option<rwhisper::Whisper>,
}

const PLUGIN_NAME: &str = "local-stt";

pub trait LocalSttExt<R: tauri::Runtime> {
    fn local_stt_state(&self) -> &SharedState;
}

impl<R: tauri::Runtime, T: Manager<R>> crate::LocalSttExt<R> for T {
    fn local_stt_state(&self) -> &SharedState {
        self.state::<SharedState>().inner()
    }
}

fn make_specta_builder() -> tauri_specta::Builder<Wry> {
    tauri_specta::Builder::<Wry>::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![
            commands::load_model::<Wry>,
            commands::unload_model
        ])
        .error_handling(tauri_specta::ErrorHandlingMode::Throw)
}

pub fn init() -> tauri::plugin::TauriPlugin<Wry> {
    let specta_builder = make_specta_builder();

    tauri::plugin::Builder::new(PLUGIN_NAME)
        .invoke_handler(specta_builder.invoke_handler())
        .setup(|app, _api| {
            app.manage(SharedState::default());
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
