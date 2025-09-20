use std::collections::HashMap;

use tauri::Manager;
use tauri_specta::Event;

use ractor::{
    call_t, Actor, ActorCell, ActorName, ActorProcessingErr, ActorRef, RpcReplyPort,
    SupervisionEvent,
};
use tokio_util::sync::CancellationToken;

const MAX_RESTART_ATTEMPTS: u32 = 3;

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

#[derive(Default)]
pub struct ActorRefs {
    source: Option<ActorRef<SourceCtrl>>,
    processor: Option<ActorRef<ProcMsg>>,
    recorder: Option<ActorRef<RecMsg>>,
    listen: Option<ActorRef<ListenMsg>>,
}

impl ActorRefs {
    fn stop_all(&mut self) {
        if let Some(source) = self.source.take() {
            source.stop(None);
        }
        if let Some(proc) = self.processor.take() {
            proc.stop(None);
        }
        if let Some(rec) = self.recorder.take() {
            rec.stop(None);
        }
        if let Some(listen) = self.listen.take() {
            listen.stop(None);
        }
    }
}

pub struct SessionState {
    app: tauri::AppHandle,
    state: State,
    session_id: Option<String>,
    session_start_ts_ms: Option<u64>,

    actors: ActorRefs,

    record_enabled: bool,
    languages: Vec<hypr_language::Language>,
    onboarding: bool,

    token: CancellationToken,

    restart_attempts: HashMap<String, u32>,
    supervisor: Option<ActorCell>,
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
            actors: ActorRefs::default(),
            record_enabled: true,
            languages: vec![],
            onboarding: false,
            token: CancellationToken::new(),
            restart_attempts: HashMap::new(),
            supervisor: None,
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
                if let Some(source) = &state.actors.source {
                    source.cast(SourceCtrl::SetMicMute(muted))?;
                }
                SessionEvent::MicMuted { value: muted }.emit(&state.app)?;
            }

            SessionMsg::SetSpeakerMute(muted) => {
                if let Some(source) = &state.actors.source {
                    source.cast(SourceCtrl::SetSpkMute(muted))?;
                }
                SessionEvent::SpeakerMuted { value: muted }.emit(&state.app)?;
            }

            SessionMsg::GetMicDeviceName(reply) => {
                if !reply.is_closed() {
                    let device_name = if let Some(source) = &state.actors.source {
                        call_t!(source, SourceCtrl::GetMicDevice, 100).unwrap_or(None)
                    } else {
                        None
                    };

                    let _ = reply.send(device_name);
                }
            }

            SessionMsg::GetMicMute(reply) => {
                let muted = if let Some(source) = &state.actors.source {
                    call_t!(source, SourceCtrl::GetMicMute, 100)?
                } else {
                    false
                };

                if !reply.is_closed() {
                    let _ = reply.send(muted);
                }
            }

            SessionMsg::GetSpeakerMute(reply) => {
                let muted = if let Some(source) = &state.actors.source {
                    call_t!(source, SourceCtrl::GetSpkMute, 100)?
                } else {
                    false
                };

                if !reply.is_closed() {
                    let _ = reply.send(muted);
                }
            }

            SessionMsg::ChangeMicDevice(device) => {
                if let Some(source) = &state.actors.source {
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

                if let Some(name) = actor.get_name() {
                    state.restart_attempts.remove(&name.to_string());
                }
            }

            SupervisionEvent::ActorFailed(actor, _)
            | SupervisionEvent::ActorTerminated(actor, _, _) => {
                let actor_name = actor
                    .get_name()
                    .map(|n| n.to_string())
                    .unwrap_or_else(|| "unknown".to_string());

                if !matches!(state.state, State::RunningActive) {
                    return Ok(());
                }

                let attempts = {
                    let v = state
                        .restart_attempts
                        .entry(actor_name.clone())
                        .or_insert(0);
                    *v += 1;
                    v
                };

                if *attempts >= MAX_RESTART_ATTEMPTS {
                    self.stop_session(state).await?;
                } else {
                    tracing::info!("{}_attempting_restart", actor_name);

                    if let Err(_) = SessionSupervisor::restart_actor(&actor_name, state).await {
                        self.stop_session(state).await?;
                    }
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
        state.supervisor = Some(supervisor.clone());
        state.restart_attempts.clear();

        let (processor_ref, _) = Actor::spawn_linked(
            Some(AudioProcessor::name()),
            AudioProcessor {},
            ProcArgs {
                app: state.app.clone(),
            },
            supervisor.clone(),
        )
        .await?;
        state.actors.processor = Some(processor_ref.clone());

        state.actors.source =
            Some(Self::spawn_source(state, &processor_ref, supervisor.clone()).await?);

        if state.record_enabled {
            let rec_ref = Self::spawn_recorder(state, &session_id, supervisor.clone()).await?;
            processor_ref.cast(ProcMsg::AttachRecorder(rec_ref.clone()))?;
            state.actors.recorder = Some(rec_ref);
        }

        let listen_ref = Self::spawn_listen_bridge(state, &session_id, supervisor).await?;
        processor_ref.cast(ProcMsg::AttachListener(listen_ref.clone()))?;
        state.actors.listen = Some(listen_ref);

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
        state.actors.stop_all();

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

    async fn spawn_source(
        state: &SessionState,
        processor_ref: &ActorRef<ProcMsg>,
        supervisor: ActorCell,
    ) -> Result<ActorRef<SourceCtrl>, ActorProcessingErr> {
        let (source_ref, _) = Actor::spawn_linked(
            Some(SourceActor::name()),
            SourceActor,
            SourceArgs {
                proc: processor_ref.clone(),
                token: state.token.clone(),
                device: None,
            },
            supervisor,
        )
        .await?;
        Ok(source_ref)
    }

    async fn spawn_recorder(
        state: &SessionState,
        session_id: &str,
        supervisor: ActorCell,
    ) -> Result<ActorRef<RecMsg>, ActorProcessingErr> {
        let app_dir = state.app.path().app_data_dir().unwrap();
        let (rec_ref, _) = Actor::spawn_linked(
            Some(Recorder::name()),
            Recorder,
            RecArgs {
                app_dir,
                session_id: session_id.to_string(),
                file_suffix: None,
            },
            supervisor,
        )
        .await?;
        Ok(rec_ref)
    }

    async fn spawn_listen_bridge(
        state: &SessionState,
        session_id: &str,
        supervisor: ActorCell,
    ) -> Result<ActorRef<ListenMsg>, ActorProcessingErr> {
        let (listen_ref, _) = Actor::spawn_linked(
            Some(ListenBridge::name()),
            ListenBridge,
            ListenArgs {
                app: state.app.clone(),
                session_id: session_id.to_string(),
                languages: state.languages.clone(),
                onboarding: state.onboarding,
                session_start_ts_ms: state.session_start_ts_ms.unwrap_or(0),
            },
            supervisor,
        )
        .await?;
        Ok(listen_ref)
    }

    async fn restart_actor(
        actor_name: &str,
        state: &mut SessionState,
    ) -> Result<(), ActorProcessingErr> {
        let supervisor = state
            .supervisor
            .as_ref()
            .ok_or_else(|| ActorProcessingErr::from("No supervisor available"))?
            .clone();

        match actor_name {
            name if name == AudioProcessor::name() => {
                Self::restart_processor(state, supervisor).await?;
            }
            name if name == SourceActor::name() => {
                Self::restart_source_actor(state, supervisor).await?;
            }
            name if name == Recorder::name() => {
                Self::restart_recorder_actor(state, supervisor).await?;
            }
            name if name == ListenBridge::name() => {
                Self::restart_listener_actor(state, supervisor).await?;
            }
            _ => {}
        }

        Ok(())
    }

    async fn restart_processor(
        state: &mut SessionState,
        supervisor: ActorCell,
    ) -> Result<(), ActorProcessingErr> {
        if let Some(old_proc) = state.actors.processor.take() {
            old_proc.stop(None);
        }

        let (processor_ref, _) = Actor::spawn_linked(
            Some(AudioProcessor::name()),
            AudioProcessor {},
            ProcArgs {
                app: state.app.clone(),
            },
            supervisor.clone(),
        )
        .await?;

        state.actors.processor = Some(processor_ref.clone());

        if let Some(rec) = &state.actors.recorder {
            processor_ref.cast(ProcMsg::AttachRecorder(rec.clone()))?;
        }
        if let Some(listen) = &state.actors.listen {
            processor_ref.cast(ProcMsg::AttachListener(listen.clone()))?;
        }

        if let Some(old_source) = state.actors.source.take() {
            old_source.stop(None);
            state.actors.source =
                Some(Self::spawn_source(state, &processor_ref, supervisor).await?);
        }

        Ok(())
    }

    async fn restart_source_actor(
        state: &mut SessionState,
        supervisor: ActorCell,
    ) -> Result<(), ActorProcessingErr> {
        if let Some(old_source) = state.actors.source.take() {
            old_source.stop(None);
        }

        if let Some(processor_ref) = &state.actors.processor {
            state.actors.source = Some(Self::spawn_source(state, processor_ref, supervisor).await?);
        }

        Ok(())
    }

    async fn restart_recorder_actor(
        state: &mut SessionState,
        supervisor: ActorCell,
    ) -> Result<(), ActorProcessingErr> {
        if let Some(old_rec) = state.actors.recorder.take() {
            old_rec.stop(None);
        }

        if !state.record_enabled {
            return Ok(());
        }

        if let (Some(session_id), Some(processor_ref)) =
            (&state.session_id, &state.actors.processor)
        {
            let rec_ref = Self::spawn_recorder(state, session_id, supervisor).await?;
            processor_ref.cast(ProcMsg::AttachRecorder(rec_ref.clone()))?;
            state.actors.recorder = Some(rec_ref);
        }

        Ok(())
    }

    async fn restart_listener_actor(
        state: &mut SessionState,
        supervisor: ActorCell,
    ) -> Result<(), ActorProcessingErr> {
        if let Some(old_listen) = state.actors.listen.take() {
            old_listen.stop(None);
        }

        if let (Some(session_id), Some(processor_ref)) =
            (&state.session_id, &state.actors.processor)
        {
            let listen_ref = Self::spawn_listen_bridge(state, session_id, supervisor).await?;
            processor_ref.cast(ProcMsg::AttachListener(listen_ref.clone()))?;
            state.actors.listen = Some(listen_ref);
        }

        Ok(())
    }
}
