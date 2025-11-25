use ractor::ActorCell;
use ractor_supervisor::dynamic::DynamicSupervisorMsg;
use tauri::Manager;
use tokio::sync::Mutex;

mod actors;
mod commands;
mod error;
mod events;
mod ext;
pub mod fsm;
mod supervisor;

pub use error::*;
pub use events::*;
pub use ext::*;
pub use supervisor::{SupervisorHandle, SupervisorRef, SUPERVISOR_NAME};

const PLUGIN_NAME: &str = "listener";

pub type SharedState = std::sync::Arc<Mutex<State>>;

pub struct State {
    pub app: tauri::AppHandle,
    pub listener_supervisor: Option<ractor::ActorRef<DynamicSupervisorMsg>>,
    pub supervisor_handle: Option<SupervisorHandle>,
}

#[derive(Default)]
pub struct InitOptions {
    pub parent_supervisor: Option<ActorCell>,
}

impl State {
    pub async fn get_state(&self) -> fsm::State {
        if ractor::registry::where_is(actors::ControllerActor::name()).is_some() {
            crate::fsm::State::RunningActive
        } else {
            crate::fsm::State::Inactive
        }
    }
}

fn make_specta_builder<R: tauri::Runtime>() -> tauri_specta::Builder<R> {
    tauri_specta::Builder::<R>::new()
        .plugin_name(PLUGIN_NAME)
        .commands(tauri_specta::collect_commands![
            commands::list_microphone_devices::<tauri::Wry>,
            commands::get_current_microphone_device::<tauri::Wry>,
            commands::set_microphone_device::<tauri::Wry>,
            commands::get_mic_muted::<tauri::Wry>,
            commands::set_mic_muted::<tauri::Wry>,
            commands::start_session::<tauri::Wry>,
            commands::stop_session::<tauri::Wry>,
            commands::get_state::<tauri::Wry>,
            commands::run_batch::<tauri::Wry>,
        ])
        .events(tauri_specta::collect_events![SessionEvent])
        .error_handling(tauri_specta::ErrorHandlingMode::Result)
}

pub fn init(options: InitOptions) -> tauri::plugin::TauriPlugin<tauri::Wry> {
    let specta_builder = make_specta_builder();

    tauri::plugin::Builder::new(PLUGIN_NAME)
        .invoke_handler(specta_builder.invoke_handler())
        .setup(move |app, _api| {
            specta_builder.mount_events(app);

            let app_handle = app.app_handle().clone();

            let state: SharedState = std::sync::Arc::new(Mutex::new(State {
                app: app_handle,
                listener_supervisor: None,
                supervisor_handle: None,
            }));

            app.manage(state.clone());

            let parent = options.parent_supervisor.clone();
            tauri::async_runtime::spawn(async move {
                match supervisor::spawn_listener_supervisor(parent).await {
                    Ok((supervisor, handle)) => {
                        let mut guard = state.lock().await;
                        guard.listener_supervisor = Some(supervisor);
                        guard.supervisor_handle = Some(handle);
                        tracing::info!("listener_supervisor_spawned");
                    }
                    Err(e) => {
                        tracing::error!("failed_to_spawn_listener_supervisor: {:?}", e);
                    }
                }
            });

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
