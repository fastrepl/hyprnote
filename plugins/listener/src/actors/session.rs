use tauri::Manager;
use tauri_specta::Event;

use ractor::{
    call_t, concurrency, registry, Actor, ActorCell, ActorName, ActorProcessingErr, ActorRef,
    RpcReplyPort, SupervisionEvent,
};
use tokio_util::sync::CancellationToken;

use crate::{
    actors::{
        ListenerActor, ListenerArgs, ListenerMsg, ProcArgs, ProcMsg, ProcessorActor, RecArgs,
        RecMsg, RecorderActor, SourceActor, SourceArgs, SourceMsg,
    },
    SessionEvent,
};

#[derive(Debug)]
pub enum SessionMsg {
    SetMicMute(bool),
    SetSpeakerMute(bool),
    GetMicMute(RpcReplyPort<bool>),
    GetSpeakerMute(RpcReplyPort<bool>),
    GetMicDeviceName(RpcReplyPort<Option<String>>),
    ChangeMicDevice(Option<String>),
}

pub struct SessionArgs {
    pub app: tauri::AppHandle,
    pub session_id: String,
}

pub struct SessionState {
    app: tauri::AppHandle,
    session_id: String,
    session_start_ts_ms: u64,
    languages: Vec<hypr_language::Language>,
    onboarding: bool,
    token: CancellationToken,
    record_enabled: bool,
}

pub struct SessionActor;

impl SessionActor {
    pub fn name() -> ActorName {
        "session".into()
    }
}

impl Actor for SessionActor {
    type Msg = SessionMsg;
    type State = SessionState;
    type Arguments = SessionArgs;

    async fn pre_start(
        &self,
        myself: ActorRef<Self::Msg>,
        args: Self::Arguments,
    ) -> Result<Self::State, ActorProcessingErr> {
        use tauri_plugin_db::{DatabasePluginExt, UserDatabase};

        let session_id = args.session_id.clone();
        let onboarding_session_id = UserDatabase::onboarding_session_id();
        let onboarding = session_id == onboarding_session_id;
        let user_id = args.app.db_user_id().await?.unwrap();

        let config = args.app.db_get_config(&user_id).await?;
        let record_enabled = config
            .as_ref()
            .is_none_or(|c| c.general.save_recordings.unwrap_or(true));
        let languages = config.as_ref().map_or_else(
            || vec![hypr_language::ISO639::En.into()],
            |c| c.general.spoken_languages.clone(),
        );
        let cancellation_token = CancellationToken::new();

        if let Ok(Some(mut session)) = args.app.db_get_session(&args.session_id).await {
            session.record_start = Some(chrono::Utc::now());
            let _ = args.app.db_upsert_session(session).await;
        }

        {
            use tauri_plugin_tray::TrayPluginExt;
            let _ = args.app.set_start_disabled(true);
        }

        let session_start_ts_ms = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;

        let state = SessionState {
            app: args.app,
            session_id,
            session_start_ts_ms,
            languages,
            onboarding,
            token: cancellation_token,
            record_enabled,
        };

        {
            let c = myself.get_cell();
            Self::start_all_actors(c, &state).await?;
        }

        SessionEvent::RunningActive {}.emit(&state.app).unwrap();
        Ok(state)
    }

    async fn handle(
        &self,
        _myself: ActorRef<Self::Msg>,
        message: Self::Msg,
        state: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        match message {
            SessionMsg::SetMicMute(muted) => {
                if let Some(cell) = registry::where_is(SourceActor::name()) {
                    let actor: ActorRef<SourceMsg> = cell.into();
                    actor.cast(SourceMsg::SetMicMute(muted))?;
                }
                SessionEvent::MicMuted { value: muted }.emit(&state.app)?;
            }

            SessionMsg::SetSpeakerMute(muted) => {
                if let Some(cell) = registry::where_is(SourceActor::name()) {
                    let actor: ActorRef<SourceMsg> = cell.into();
                    actor.cast(SourceMsg::SetSpkMute(muted))?;
                }
                SessionEvent::SpeakerMuted { value: muted }.emit(&state.app)?;
            }

            SessionMsg::GetMicDeviceName(reply) => {
                if !reply.is_closed() {
                    let device_name = if let Some(cell) = registry::where_is(SourceActor::name()) {
                        let actor: ActorRef<SourceMsg> = cell.into();
                        call_t!(actor, SourceMsg::GetMicDevice, 100).unwrap_or(None)
                    } else {
                        None
                    };

                    let _ = reply.send(device_name);
                }
            }

            SessionMsg::GetMicMute(reply) => {
                let muted = if let Some(cell) = registry::where_is(SourceActor::name()) {
                    let actor: ActorRef<SourceMsg> = cell.into();
                    call_t!(actor, SourceMsg::GetMicMute, 100)?
                } else {
                    false
                };

                if !reply.is_closed() {
                    let _ = reply.send(muted);
                }
            }

            SessionMsg::GetSpeakerMute(reply) => {
                let muted = if let Some(cell) = registry::where_is(SourceActor::name()) {
                    let actor: ActorRef<SourceMsg> = cell.into();
                    call_t!(actor, SourceMsg::GetSpkMute, 100)?
                } else {
                    false
                };

                if !reply.is_closed() {
                    let _ = reply.send(muted);
                }
            }

            SessionMsg::ChangeMicDevice(device) => {
                if let Some(cell) = registry::where_is(SourceActor::name()) {
                    let actor: ActorRef<SourceMsg> = cell.into();
                    actor.cast(SourceMsg::SetMicDevice(device))?;
                }
            }
        }

        Ok(())
    }

    async fn handle_supervisor_evt(
        &self,
        myself: ActorRef<Self::Msg>,
        event: SupervisionEvent,
        state: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        match event {
            SupervisionEvent::ActorStarted(actor) => {
                tracing::info!("{:?}_actor_started", actor.get_name());
            }

            SupervisionEvent::ActorFailed(actor, _)
            | SupervisionEvent::ActorTerminated(actor, _, _) => {
                let actor_name = actor
                    .get_name()
                    .map(|n| n.to_string())
                    .unwrap_or_else(|| "unknown".to_string());

                if actor_name == ListenerActor::name() {
                    Self::start_listener(myself.get_cell(), state).await?;
                } else {
                    let _ = myself.stop_and_wait(None, None).await;
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
        state.token.cancel();

        {
            Self::stop_all_actors().await;
        }

        use tauri_plugin_db::DatabasePluginExt;

        if let Ok(Some(mut session)) = state.app.db_get_session(&state.session_id).await {
            session.record_end = Some(chrono::Utc::now());
            let _ = state.app.db_upsert_session(session).await;
        }

        {
            use tauri_plugin_tray::TrayPluginExt;
            let _ = state.app.set_start_disabled(false);
        }

        {
            use tauri_plugin_windows::{HyprWindow, WindowsPluginExt};
            let _ = state.app.window_hide(HyprWindow::Control);
        }

        SessionEvent::Inactive {}.emit(&state.app)?;

        Ok(())
    }
}

impl SessionActor {
    async fn start_all_actors(
        supervisor: ActorCell,
        state: &SessionState,
    ) -> Result<(), ActorProcessingErr> {
        Self::start_processor(supervisor.clone(), state).await?;
        Self::start_source(supervisor.clone(), state).await?;
        Self::start_listener(supervisor.clone(), state).await?;

        if state.record_enabled {
            Self::start_recorder(supervisor, state).await?;
        }

        Ok(())
    }

    async fn stop_all_actors() {
        Self::stop_processor().await;
        Self::stop_source().await;
        Self::stop_listener().await;
        Self::stop_recorder().await;
    }

    async fn start_source(
        supervisor: ActorCell,
        state: &SessionState,
    ) -> Result<ActorRef<SourceMsg>, ActorProcessingErr> {
        let (ar, _) = Actor::spawn_linked(
            Some(SourceActor::name()),
            SourceActor,
            SourceArgs {
                token: state.token.clone(),
                mic_device: None,
                onboarding: state.onboarding,
            },
            supervisor,
        )
        .await?;
        Ok(ar)
    }

    async fn stop_source() {
        if let Some(cell) = registry::where_is(SourceActor::name()) {
            let actor: ActorRef<SourceMsg> = cell.into();
            let _ = actor
                .stop_and_wait(
                    Some("restart".to_string()),
                    Some(concurrency::Duration::from_secs(3)),
                )
                .await;
        }
    }

    async fn start_processor(
        supervisor: ActorCell,
        state: &SessionState,
    ) -> Result<ActorRef<ProcMsg>, ActorProcessingErr> {
        let (ar, _) = Actor::spawn_linked(
            Some(ProcessorActor::name()),
            ProcessorActor {},
            ProcArgs {
                app: state.app.clone(),
            },
            supervisor,
        )
        .await?;
        Ok(ar)
    }

    async fn stop_processor() {
        if let Some(cell) = registry::where_is(ProcessorActor::name()) {
            let actor: ActorRef<ProcMsg> = cell.into();
            let _ = actor
                .stop_and_wait(
                    Some("restart".to_string()),
                    Some(concurrency::Duration::from_secs(3)),
                )
                .await;
        }
    }

    async fn start_recorder(
        supervisor: ActorCell,
        state: &SessionState,
    ) -> Result<ActorRef<RecMsg>, ActorProcessingErr> {
        let (rec_ref, _) = Actor::spawn_linked(
            Some(RecorderActor::name()),
            RecorderActor,
            RecArgs {
                app_dir: state.app.path().app_data_dir().unwrap(),
                session_id: state.session_id.clone(),
            },
            supervisor,
        )
        .await?;
        Ok(rec_ref)
    }

    async fn stop_recorder() {
        if let Some(cell) = registry::where_is(RecorderActor::name()) {
            let actor: ActorRef<RecMsg> = cell.into();
            let _ = actor
                .stop_and_wait(
                    Some("restart".to_string()),
                    Some(concurrency::Duration::from_secs(3)),
                )
                .await;
        }
    }

    async fn start_listener(
        supervisor: ActorCell,
        state: &SessionState,
    ) -> Result<ActorRef<ListenerMsg>, ActorProcessingErr> {
        let (listen_ref, _) = Actor::spawn_linked(
            Some(ListenerActor::name()),
            ListenerActor,
            ListenerArgs {
                app: state.app.clone(),
                session_id: state.session_id.to_string(),
                languages: state.languages.clone(),
                onboarding: state.onboarding,
                session_start_ts_ms: state.session_start_ts_ms,
            },
            supervisor,
        )
        .await?;
        Ok(listen_ref)
    }

    async fn stop_listener() {
        if let Some(cell) = registry::where_is(ListenerActor::name()) {
            let actor: ActorRef<ListenerMsg> = cell.into();
            let _ = actor
                .stop_and_wait(
                    Some("restart".to_string()),
                    Some(concurrency::Duration::from_secs(3)),
                )
                .await;
        }
    }
}
