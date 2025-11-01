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
    GetMicMute(RpcReplyPort<bool>),
    GetMicDeviceName(RpcReplyPort<Option<String>>),
    ChangeMicDevice(Option<String>),
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct SessionParams {
    pub session_id: String,
    pub languages: Vec<hypr_language::Language>,
    pub onboarding: bool,
    pub record_enabled: bool,
    pub model: String,
    pub base_url: String,
    pub api_key: String,
    pub keywords: Vec<String>,
}

pub struct SessionArgs {
    pub app: tauri::AppHandle,
    pub params: SessionParams,
}

pub struct SessionState {
    app: tauri::AppHandle,
    token: CancellationToken,
    params: SessionParams,
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
        let cancellation_token = CancellationToken::new();

        {
            use tauri_plugin_tray::TrayPluginExt;
            let _ = args.app.set_start_disabled(true);
        }

        let state = SessionState {
            app: args.app,
            token: cancellation_token,
            params: args.params,
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
        _state: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        match event {
            SupervisionEvent::ActorStarted(actor) => {
                tracing::info!("{:?}_actor_started", actor.get_name());
            }
            SupervisionEvent::ActorTerminated(actor, _maybe_state, exit_reason) => {
                let actor_name = actor
                    .get_name()
                    .map(|n| n.to_string())
                    .unwrap_or_else(|| "unknown".to_string());

                tracing::error!(
                    actor = %actor_name,
                    reason = ?exit_reason,
                    "child_actor_terminated_stopping_session"
                );

                myself.stop(None);
            }
            SupervisionEvent::ActorFailed(_, _) => {}
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

        {
            use tauri_plugin_tray::TrayPluginExt;
            let _ = state.app.set_start_disabled(false);
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
        Self::start_listener(supervisor.clone(), state, None).await?;

        if state.params.record_enabled {
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
                onboarding: state.params.onboarding,
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
                session_id: state.params.session_id.clone(),
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
        session_state: &SessionState,
        listener_args: Option<ListenerArgs>,
    ) -> Result<ActorRef<ListenerMsg>, ActorProcessingErr> {
        let (listen_ref, _) = Actor::spawn_linked(
            Some(ListenerActor::name()),
            ListenerActor,
            listener_args.unwrap_or(ListenerArgs {
                app: session_state.app.clone(),
                languages: session_state.params.languages.clone(),
                onboarding: session_state.params.onboarding,
                model: session_state.params.model.clone(),
                base_url: session_state.params.base_url.clone(),
                api_key: session_state.params.api_key.clone(),
                keywords: session_state.params.keywords.clone(),
            }),
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
