use std::time::{Instant, SystemTime};

use tauri::Manager;
use tauri_specta::Event;
use tokio_util::sync::CancellationToken;

use ractor::{
    call_t, concurrency, registry, Actor, ActorCell, ActorName, ActorProcessingErr, ActorRef,
    RpcReplyPort, SupervisionEvent,
};

use crate::{
    actors::{
        ListenerActor, ListenerArgs, ListenerMsg, RecArgs, RecMsg, RecorderActor, SourceActor,
        SourceArgs, SourceMsg,
    },
    SessionEvent,
};

#[derive(Debug)]
pub enum ControllerMsg {
    SetMicMute(bool),
    GetMicMute(RpcReplyPort<bool>),
    GetMicDeviceName(RpcReplyPort<Option<String>>),
    ChangeMicDevice(Option<String>),
    GetSessionId(RpcReplyPort<String>),
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct ControllerParams {
    pub session_id: String,
    pub languages: Vec<hypr_language::Language>,
    pub onboarding: bool,
    pub record_enabled: bool,
    pub model: String,
    pub base_url: String,
    pub api_key: String,
    pub keywords: Vec<String>,
}

pub struct ControllerArgs {
    pub app: tauri::AppHandle,
    pub params: ControllerParams,
}

pub struct ControllerState {
    app: tauri::AppHandle,
    token: CancellationToken,
    params: ControllerParams,
    started_at_instant: Instant,
    started_at_system: SystemTime,
}

pub struct ControllerActor;

impl ControllerActor {
    pub fn name() -> ActorName {
        "controller".into()
    }
}

#[ractor::async_trait]
impl Actor for ControllerActor {
    type Msg = ControllerMsg;
    type State = ControllerState;
    type Arguments = ControllerArgs;

    async fn pre_start(
        &self,
        myself: ActorRef<Self::Msg>,
        args: Self::Arguments,
    ) -> Result<Self::State, ActorProcessingErr> {
        let cancellation_token = CancellationToken::new();
        let started_at_instant = Instant::now();
        let started_at_system = SystemTime::now();

        {
            use tauri_plugin_tray::TrayPluginExt;
            let _ = args.app.set_start_disabled(true);
        }

        let state = ControllerState {
            app: args.app,
            token: cancellation_token,
            params: args.params,
            started_at_instant,
            started_at_system,
        };

        {
            let c = myself.get_cell();
            Self::start_all_actors(c, &state).await?;
        }

        SessionEvent::RunningActive {
            session_id: state.params.session_id.clone(),
        }
        .emit(&state.app)
        .unwrap();
        Ok(state)
    }

    async fn handle(
        &self,
        _myself: ActorRef<Self::Msg>,
        message: Self::Msg,
        state: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        match message {
            ControllerMsg::SetMicMute(muted) => {
                if let Some(cell) = registry::where_is(SourceActor::name()) {
                    let actor: ActorRef<SourceMsg> = cell.into();
                    actor.cast(SourceMsg::SetMicMute(muted))?;
                }
                SessionEvent::MicMuted {
                    session_id: state.params.session_id.clone(),
                    value: muted,
                }
                .emit(&state.app)?;
            }

            ControllerMsg::GetMicDeviceName(reply) => {
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

            ControllerMsg::GetMicMute(reply) => {
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

            ControllerMsg::ChangeMicDevice(device) => {
                if let Some(cell) = registry::where_is(SourceActor::name()) {
                    let actor: ActorRef<SourceMsg> = cell.into();
                    actor.cast(SourceMsg::SetMicDevice(device))?;
                }
            }

            ControllerMsg::GetSessionId(reply) => {
                if !reply.is_closed() {
                    let _ = reply.send(state.params.session_id.clone());
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

        SessionEvent::Inactive {
            session_id: state.params.session_id.clone(),
        }
        .emit(&state.app)?;

        Ok(())
    }
}

impl ControllerActor {
    async fn start_all_actors(
        supervisor: ActorCell,
        state: &ControllerState,
    ) -> Result<(), ActorProcessingErr> {
        Self::start_source(supervisor.clone(), state).await?;
        Self::start_listener(supervisor.clone(), state, None).await?;

        if state.params.record_enabled {
            Self::start_recorder(supervisor, state).await?;
        }

        Ok(())
    }

    async fn stop_all_actors() {
        Self::stop_source().await;
        Self::stop_listener().await;
        Self::stop_recorder().await;
    }

    async fn start_source(
        supervisor: ActorCell,
        state: &ControllerState,
    ) -> Result<ActorRef<SourceMsg>, ActorProcessingErr> {
        let (ar, _) = Actor::spawn_linked(
            Some(SourceActor::name()),
            SourceActor,
            SourceArgs {
                token: state.token.clone(),
                mic_device: None,
                onboarding: state.params.onboarding,
                app: state.app.clone(),
                session_id: state.params.session_id.clone(),
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

    async fn start_recorder(
        supervisor: ActorCell,
        state: &ControllerState,
    ) -> Result<ActorRef<RecMsg>, ActorProcessingErr> {
        let (rec_ref, _) = Actor::spawn_linked(
            Some(RecorderActor::name()),
            RecorderActor,
            RecArgs {
                app_dir: dirs::data_dir().unwrap().join("hyprnote").join("sessions"),
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
                    Some(concurrency::Duration::from_secs(6)),
                )
                .await;
        }
    }

    async fn start_listener(
        supervisor: ActorCell,
        session_state: &ControllerState,
        listener_args: Option<ListenerArgs>,
    ) -> Result<ActorRef<ListenerMsg>, ActorProcessingErr> {
        use crate::actors::ChannelMode;

        let mode = if listener_args.is_none() {
            if let Some(cell) = registry::where_is(SourceActor::name()) {
                let actor: ActorRef<SourceMsg> = cell.into();
                match call_t!(actor, SourceMsg::GetMode, 500) {
                    Ok(m) => m,
                    Err(_) => ChannelMode::Dual,
                }
            } else {
                ChannelMode::Dual
            }
        } else {
            ChannelMode::Dual
        };

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
                mode,
                session_started_at: session_state.started_at_instant,
                session_started_at_unix: session_state.started_at_system,
                session_id: session_state.params.session_id.clone(),
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
