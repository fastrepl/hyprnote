use ractor::{Actor, ActorRef};
use tauri::Manager;
use tokio::sync::Mutex;

mod actors;
mod commands;
mod error;
mod events;
mod ext;
pub mod fsm;
mod manager;

pub use error::*;
pub use events::*;
pub use ext::*;

use crate::actors::{SessionArgs, SessionMsg, SessionSupervisor};

const PLUGIN_NAME: &str = "listener";

pub type SharedState = Mutex<State>;

pub struct State {
    supervisor: Option<ActorRef<SessionMsg>>,
}

impl State {
    pub async fn get_state(&self) -> fsm::State {
        if let Some(supervisor) = &self.supervisor {
            match ractor::call_t!(supervisor, SessionMsg::GetState, 100) {
                Ok(state) => state,
                Err(_) => fsm::State::Inactive {},
            }
        } else {
            fsm::State::Inactive {}
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
            commands::check_microphone_access::<tauri::Wry>,
            commands::check_system_audio_access::<tauri::Wry>,
            commands::request_microphone_access::<tauri::Wry>,
            commands::request_system_audio_access::<tauri::Wry>,
            commands::open_microphone_access_settings::<tauri::Wry>,
            commands::open_system_audio_access_settings::<tauri::Wry>,
            commands::get_mic_muted::<tauri::Wry>,
            commands::set_mic_muted::<tauri::Wry>,
            commands::get_speaker_muted::<tauri::Wry>,
            commands::set_speaker_muted::<tauri::Wry>,
            commands::start_session::<tauri::Wry>,
            commands::stop_session::<tauri::Wry>,
            commands::get_state::<tauri::Wry>,
        ])
        .events(tauri_specta::collect_events![SessionEvent])
        .error_handling(tauri_specta::ErrorHandlingMode::Throw)
}

pub fn init() -> tauri::plugin::TauriPlugin<tauri::Wry> {
    let specta_builder = make_specta_builder();

    tauri::plugin::Builder::new(PLUGIN_NAME)
        .invoke_handler(specta_builder.invoke_handler())
        .setup(move |app, _api| {
            specta_builder.mount_events(app);

            let state: SharedState = Mutex::new(State { supervisor: None });
            app.manage(state);

            let app_handle = app.app_handle().clone();

            tokio::spawn(async move {
                match Actor::spawn(
                    Some(SessionSupervisor::name()),
                    SessionSupervisor,
                    SessionArgs {
                        app: app_handle.clone(),
                    },
                )
                .await
                {
                    Ok((supervisor_ref, join_handle)) => {
                        {
                            let state_ref = app_handle.state::<SharedState>();
                            let mut state = state_ref.lock().await;
                            state.supervisor = Some(supervisor_ref);
                        }

                        tokio::spawn(async move {
                            if let Err(e) = join_handle.await {
                                tracing::error!("SessionSupervisor terminated with error: {:?}", e);
                            } else {
                                tracing::info!("SessionSupervisor terminated gracefully");
                            }
                        });
                    }
                    Err(e) => {
                        tracing::error!("Failed to spawn SessionSupervisor: {}", e);
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
