use tauri::{Manager, Wry};

mod commands;
mod error;
mod model;
mod server;

pub use error::{Error, Result};

const PLUGIN_NAME: &str = "local-llm";

type SharedState = std::sync::Arc<tokio::sync::Mutex<State>>;

#[derive(Default)]
pub struct State {
    pub api_base: String,
    pub model: Option<kalosm_llama::Llama>,
    pub server: Option<crate::server::ServerHandle>,
}

pub trait LocalLlmExt<R: tauri::Runtime> {
    fn local_llm_state(&self) -> &SharedState;
}

impl<R: tauri::Runtime, T: Manager<R>> crate::LocalLlmExt<R> for T {
    fn local_llm_state(&self) -> &SharedState {
        self.state::<SharedState>().inner()
    }
}

fn make_specta_builder() -> tauri_specta::Builder<Wry> {
    tauri_specta::Builder::<Wry>::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![
            commands::load_model::<Wry>,
            commands::unload_model,
            commands::stop_server,
        ])
        .error_handling(tauri_specta::ErrorHandlingMode::Throw)
}

pub fn init() -> tauri::plugin::TauriPlugin<Wry> {
    let specta_builder = make_specta_builder();
    let state = SharedState::default();

    tauri::plugin::Builder::new(PLUGIN_NAME)
        .invoke_handler(specta_builder.invoke_handler())
        .setup(|app, _api| {
            tokio::task::block_in_place(|| {
                tokio::runtime::Handle::current().block_on(async {
                    let handle = server::run_server(state.clone()).await.unwrap();
                    let mut state = state.lock().await;
                    state.api_base = format!("http://{}", handle.addr);
                    state.server = Some(handle);
                    tracing::info!(api_base = state.api_base, "llm_server_started");
                });
            });

            app.manage(state);
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
                "./generated/bindings.ts",
            )
            .unwrap()
    }
}
