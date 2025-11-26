use std::future::Future;
use std::time::{Instant, SystemTime};

use ractor::{call_t, registry, ActorRef};
use tauri::{path::BaseDirectory, Manager};
use tauri_specta::Event;

use crate::{
    actors::{SourceActor, SourceMsg},
    supervisor::{spawn_session_supervisor, SessionContext, SessionParams},
    SessionEvent,
};

pub trait ListenerPluginExt<R: tauri::Runtime> {
    fn list_microphone_devices(&self) -> impl Future<Output = Result<Vec<String>, crate::Error>>;
    fn get_current_microphone_device(
        &self,
    ) -> impl Future<Output = Result<Option<String>, crate::Error>>;

    fn get_mic_muted(&self) -> impl Future<Output = bool>;
    fn set_mic_muted(&self, muted: bool) -> impl Future<Output = ()>;

    fn get_state(&self) -> impl Future<Output = crate::fsm::State>;
    fn stop_session(&self) -> impl Future<Output = ()>;
    fn start_session(&self, params: SessionParams) -> impl Future<Output = ()>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> ListenerPluginExt<R> for T {
    #[tracing::instrument(skip_all)]
    async fn list_microphone_devices(&self) -> Result<Vec<String>, crate::Error> {
        Ok(hypr_audio::AudioInput::list_mic_devices())
    }

    #[tracing::instrument(skip_all)]
    async fn get_current_microphone_device(&self) -> Result<Option<String>, crate::Error> {
        if let Some(cell) = registry::where_is(SourceActor::name()) {
            let actor: ActorRef<SourceMsg> = cell.into();
            match call_t!(actor, SourceMsg::GetMicDevice, 500) {
                Ok(device_name) => Ok(device_name),
                Err(_) => Ok(None),
            }
        } else {
            Err(crate::Error::ActorNotFound(SourceActor::name()))
        }
    }

    #[tracing::instrument(skip_all)]
    async fn get_state(&self) -> crate::fsm::State {
        let state = self.state::<crate::SharedState>();
        let guard = state.lock().await;
        guard.get_state()
    }

    #[tracing::instrument(skip_all)]
    async fn get_mic_muted(&self) -> bool {
        if let Some(cell) = registry::where_is(SourceActor::name()) {
            let actor: ActorRef<SourceMsg> = cell.into();
            match call_t!(actor, SourceMsg::GetMicMute, 100) {
                Ok(muted) => muted,
                Err(_) => false,
            }
        } else {
            false
        }
    }

    #[tracing::instrument(skip_all)]
    async fn set_mic_muted(&self, muted: bool) {
        if let Some(cell) = registry::where_is(SourceActor::name()) {
            let actor: ActorRef<SourceMsg> = cell.into();
            let _ = actor.cast(SourceMsg::SetMicMute(muted));
        }
    }

    #[tracing::instrument(skip_all)]
    async fn start_session(&self, params: SessionParams) {
        let state = self.state::<crate::SharedState>();
        let mut guard = state.lock().await;

        if guard.session_supervisor.is_some() {
            tracing::warn!("session_already_running");
            return;
        }

        let app_dir = match guard
            .app
            .path()
            .resolve("hyprnote/sessions", BaseDirectory::Data)
        {
            Ok(dir) => dir,
            Err(e) => {
                tracing::error!(error = ?e, "failed_to_resolve_app_dir");
                return;
            }
        };

        {
            use tauri_plugin_tray::TrayPluginExt;
            let _ = guard.app.set_start_disabled(true);
        }

        let ctx = SessionContext {
            app: guard.app.clone(),
            params: params.clone(),
            app_dir,
            started_at_instant: Instant::now(),
            started_at_system: SystemTime::now(),
        };

        match spawn_session_supervisor(ctx).await {
            Ok((supervisor_ref, handle)) => {
                guard.session_supervisor = Some(supervisor_ref);
                guard.supervisor_handle = Some(handle);

                SessionEvent::RunningActive {
                    session_id: params.session_id,
                }
                .emit(&guard.app)
                .unwrap();

                tracing::info!("session_started");
            }
            Err(e) => {
                tracing::error!(error = ?e, "failed_to_start_session");

                use tauri_plugin_tray::TrayPluginExt;
                let _ = guard.app.set_start_disabled(false);
            }
        }
    }

    #[tracing::instrument(skip_all)]
    async fn stop_session(&self) {
        let state = self.state::<crate::SharedState>();
        let mut guard = state.lock().await;

        let session_id = if let Some(cell) = registry::where_is(SourceActor::name()) {
            let actor: ActorRef<SourceMsg> = cell.into();
            call_t!(actor, SourceMsg::GetSessionId, 100).ok()
        } else {
            None
        };

        if let Some(session_id) = session_id.clone() {
            SessionEvent::Finalizing { session_id }
                .emit(&guard.app)
                .unwrap();
        }

        if let Some(supervisor_cell) = guard.session_supervisor.take() {
            supervisor_cell.stop(None);
        }

        if let Some(handle) = guard.supervisor_handle.take() {
            let _ = handle.await;
        }

        {
            use tauri_plugin_tray::TrayPluginExt;
            let _ = guard.app.set_start_disabled(false);
        }

        if let Some(session_id) = session_id {
            SessionEvent::Inactive { session_id }
                .emit(&guard.app)
                .unwrap();
        }

        tracing::info!("session_stopped");
    }
}
