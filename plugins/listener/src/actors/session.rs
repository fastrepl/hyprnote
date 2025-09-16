use ractor::{
    call_t, Actor, ActorCell, ActorName, ActorProcessingErr, ActorRef, RpcReplyPort,
    SupervisionEvent,
};
use tauri::Manager;
use tauri_specta::Event;
use tokio_util::sync::CancellationToken;

use crate::{
    actors::{
        AudioProcessor, ListenArgs, ListenBridge, ListenMsg, ProcArgs, ProcMsg, RecArgs, RecMsg,
        Recorder, SourceActor, SourceArgs, SourceCtrl,
    },
    fsm::State,
    SessionEvent,
};

#[derive(Debug)]
pub enum SessionMsg {
    Start { session_id: String },
    Stop,
    SetMicMute(bool),
    SetSpeakerMute(bool),
    GetMicMute(RpcReplyPort<bool>),
    GetSpeakerMute(RpcReplyPort<bool>),
    GetMicDeviceName(RpcReplyPort<Option<String>>),
    ChangeMicDevice(Option<String>),
    GetState(RpcReplyPort<State>),
}

pub struct SessionArgs {
    pub app: tauri::AppHandle,
}

pub struct SessionState {
    app: tauri::AppHandle,
    state: State,
    session_id: Option<String>,
    session_start_ts_ms: Option<u64>,

    source: Option<ActorRef<SourceCtrl>>,
    processor: Option<ActorRef<ProcMsg>>,
    recorder: Option<ActorRef<RecMsg>>,
    listen: Option<ActorRef<ListenMsg>>,

    record_enabled: bool,
    languages: Vec<hypr_language::Language>,
    onboarding: bool,

    token: CancellationToken,
}

pub struct SessionSupervisor;

impl SessionSupervisor {
    pub fn name() -> ActorName {
        "session_supervisor".into()
    }
}

impl Actor for SessionSupervisor {
    type Msg = SessionMsg;
    type State = SessionState;
    type Arguments = SessionArgs;

    async fn pre_start(
        &self,
        _myself: ActorRef<Self::Msg>,
        args: Self::Arguments,
    ) -> Result<Self::State, ActorProcessingErr> {
        Ok(SessionState {
            app: args.app,
            state: State::Inactive,
            session_id: None,
            session_start_ts_ms: None,
            source: None,
            processor: None,
            recorder: None,
            listen: None,
            record_enabled: true,
            languages: vec![],
            onboarding: false,
            token: CancellationToken::new(),
        })
    }

    async fn handle(
        &self,
        myself: ActorRef<Self::Msg>,
        message: Self::Msg,
        state: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        match message {
            SessionMsg::Start { session_id } => {
                if let State::RunningActive = state.state {
                    if let Some(current_id) = &state.session_id {
                        if current_id != &session_id {
                            self.stop_session(state).await?;
                        } else {
                            return Ok(());
                        }
                    }
                }

                self.start_session(myself.get_cell(), state, session_id)
                    .await?;
            }

            SessionMsg::Stop => {
                self.stop_session(state).await?;
            }

            SessionMsg::SetMicMute(muted) => {
                if let Some(source) = &state.source {
                    source.cast(SourceCtrl::SetMicMute(muted))?;
                }
                SessionEvent::MicMuted { value: muted }.emit(&state.app)?;
            }

            SessionMsg::SetSpeakerMute(muted) => {
                if let Some(source) = &state.source {
                    source.cast(SourceCtrl::SetSpkMute(muted))?;
                }
                SessionEvent::SpeakerMuted { value: muted }.emit(&state.app)?;
            }

            SessionMsg::GetMicDeviceName(reply) => {
                if !reply.is_closed() {
                    let device_name = if let Some(source) = &state.source {
                        call_t!(source, SourceCtrl::GetMicDevice, 100).unwrap_or(None)
                    } else {
                        None
                    };

                    let _ = reply.send(device_name);
                }
            }

            SessionMsg::GetMicMute(reply) => {
                let muted = if let Some(source) = &state.source {
                    call_t!(source, SourceCtrl::GetMicMute, 100)?
                } else {
                    false
                };

                if !reply.is_closed() {
                    let _ = reply.send(muted);
                }
            }

            SessionMsg::GetSpeakerMute(reply) => {
                let muted = if let Some(source) = &state.source {
                    call_t!(source, SourceCtrl::GetSpkMute, 100)?
                } else {
                    false
                };

                if !reply.is_closed() {
                    let _ = reply.send(muted);
                }
            }

            SessionMsg::ChangeMicDevice(device) => {
                if let Some(source) = &state.source {
                    source.cast(SourceCtrl::SetMicDevice(device))?;
                }
            }

            SessionMsg::GetState(reply) => {
                if !reply.is_closed() {
                    let _ = reply.send(state.state.clone());
                }
            }
        }

        Ok(())
    }

    async fn handle_supervisor_evt(
        &self,
        _myself: ActorRef<Self::Msg>,
        event: SupervisionEvent,
        state: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        match event {
            SupervisionEvent::ActorStarted(actor) => {
                tracing::info!("{:?}_actor_started", actor.get_name());
            }

            SupervisionEvent::ActorFailed(actor, _) => {
                tracing::error!("{:?}_actor_failed", actor.get_name());

                if matches!(state.state, State::RunningActive) {
                    self.stop_session(state).await?;
                }
            }

            SupervisionEvent::ActorTerminated(actor, _, exit_reason) => {
                tracing::info!("{:?}_actor_terminated: {:?}", actor.get_name(), exit_reason);

                if matches!(state.state, State::RunningActive) {
                    self.stop_session(state).await?;
                }
            }

            _ => {}
        }

        Ok(())
    }

    async fn post_stop(
        &self,
        _myself: ActorRef<Self::Msg>,
        state: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        self.stop_session(state).await?;
        Ok(())
    }
}

impl SessionSupervisor {
    async fn start_session(
        &self,
        supervisor: ActorCell,
        state: &mut SessionState,
        session_id: String,
    ) -> Result<(), ActorProcessingErr> {
        use tauri_plugin_db::{DatabasePluginExt, UserDatabase};

        let user_id = state.app.db_user_id().await?.unwrap();
        let onboarding_session_id = UserDatabase::onboarding_session_id();
        state.onboarding = session_id == onboarding_session_id;

        let config = state.app.db_get_config(&user_id).await?;
        state.record_enabled = config
            .as_ref()
            .is_none_or(|c| c.general.save_recordings.unwrap_or(true));
        state.languages = config.as_ref().map_or_else(
            || vec![hypr_language::ISO639::En.into()],
            |c| c.general.spoken_languages.clone(),
        );

        state.session_id = Some(session_id.clone());
        state.session_start_ts_ms = Some(
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64,
        );

        if let Ok(Some(mut session)) = state.app.db_get_session(&session_id).await {
            session.record_start = Some(chrono::Utc::now());
            let _ = state.app.db_upsert_session(session).await;
        }

        state.token = CancellationToken::new();

        let (processor_ref, _) = Actor::spawn_linked(
            Some(AudioProcessor::name()),
            AudioProcessor {},
            ProcArgs {
                app: state.app.clone(),
            },
            supervisor.clone(),
        )
        .await?;
        state.processor = Some(processor_ref.clone());

        let (source_ref, _) = Actor::spawn_linked(
            Some(SourceActor::name()),
            SourceActor,
            SourceArgs {
                proc: processor_ref.clone(),
                token: state.token.clone(),
                device: None,
            },
            supervisor.clone(),
        )
        .await?;
        state.source = Some(source_ref.clone());

        if state.record_enabled {
            let app_dir = state.app.path().app_data_dir().unwrap();
            let (rec_ref, _) = Actor::spawn_linked(
                Some(Recorder::name()),
                Recorder,
                RecArgs {
                    app_dir: app_dir.clone(),
                    session_id: session_id.clone(),
                    file_suffix: None,
                },
                supervisor.clone(),
            )
            .await?;
            state.recorder = Some(rec_ref.clone());
            processor_ref.cast(ProcMsg::AttachRecorder(rec_ref))?;
        }

        let (listen_ref, _) = Actor::spawn_linked(
            Some(ListenBridge::name()),
            ListenBridge,
            ListenArgs {
                app: state.app.clone(),
                session_id: session_id.clone(),
                languages: state.languages.clone(),
                onboarding: state.onboarding,
                session_start_ts_ms: state.session_start_ts_ms.unwrap_or(0),
            },
            supervisor,
        )
        .await?;
        state.listen = Some(listen_ref.clone());
        processor_ref.cast(ProcMsg::AttachListener(listen_ref))?;

        {
            use tauri_plugin_tray::TrayPluginExt;
            let _ = state.app.set_start_disabled(true);
        }

        state.state = State::RunningActive;
        SessionEvent::RunningActive {}.emit(&state.app)?;

        Ok(())
    }

    async fn stop_session(&self, state: &mut SessionState) -> Result<(), ActorProcessingErr> {
        if matches!(state.state, State::Inactive) {
            return Ok(());
        }

        state.token.cancel();

        if let Some(source) = state.source.take() {
            source.stop(None);
        }
        if let Some(proc) = state.processor.take() {
            proc.stop(None);
        }
        if let Some(rec) = state.recorder.take() {
            rec.stop(None);
        }

        if let Some(listen) = state.listen.take() {
            listen.stop(None);
        }

        if let Some(session_id) = &state.session_id {
            use tauri_plugin_db::DatabasePluginExt;

            if let Ok(Some(mut session)) = state.app.db_get_session(session_id).await {
                session.record_end = Some(chrono::Utc::now());
                let _ = state.app.db_upsert_session(session).await;
            }
        }

        {
            use tauri_plugin_tray::TrayPluginExt;
            let _ = state.app.set_start_disabled(false);
        }

        {
            use tauri_plugin_windows::{HyprWindow, WindowsPluginExt};
            let _ = state.app.window_hide(HyprWindow::Control);
        }

        state.session_id = None;
        state.session_start_ts_ms = None;
        state.state = State::Inactive;

        SessionEvent::Inactive {}.emit(&state.app)?;

        Ok(())
    }
}
