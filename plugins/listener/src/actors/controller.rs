use std::sync::Arc;
use std::time::{Instant, SystemTime};

use tauri_specta::Event;

use ractor::{call_t, registry, Actor, ActorName, ActorProcessingErr, ActorRef, RpcReplyPort};
use ractor_supervisor::supervisor::SupervisorMsg;

use crate::{
    actors::{LiveContext, LiveContextHandle, LiveSupervisorArgs, SourceActor, SourceMsg},
    SessionEvent,
};

#[derive(Debug)]
pub enum ControllerMsg {
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

pub struct SessionShared {
    app: tauri::AppHandle,
    params: SessionParams,
    started_at_instant: Instant,
    started_at_system: SystemTime,
    live_ctx: Arc<LiveContext>,
}

impl SessionShared {
    pub fn new(app: tauri::AppHandle, params: SessionParams) -> Arc<Self> {
        Arc::new(Self {
            app,
            params,
            started_at_instant: Instant::now(),
            started_at_system: SystemTime::now(),
            live_ctx: Arc::new(LiveContext::new()),
        })
    }

    pub fn app(&self) -> &tauri::AppHandle {
        &self.app
    }

    pub fn live_ctx(&self) -> LiveContextHandle {
        self.live_ctx.clone()
    }

    pub fn live_supervisor_args(&self) -> LiveSupervisorArgs {
        LiveSupervisorArgs {
            app: self.app.clone(),
            ctx: self.live_ctx(),
            languages: self.params.languages.clone(),
            onboarding: self.params.onboarding,
            model: self.params.model.clone(),
            base_url: self.params.base_url.clone(),
            api_key: self.params.api_key.clone(),
            keywords: self.params.keywords.clone(),
            session_started_at: self.started_at_instant,
            session_started_at_unix: self.started_at_system,
            session_id: self.params.session_id.clone(),
            record_enabled: self.params.record_enabled,
        }
    }
}

pub struct ControllerActorArgs {
    pub shared: Arc<SessionShared>,
    pub supervisor: ActorRef<SupervisorMsg>,
}

pub struct ControllerState {
    shared: Arc<SessionShared>,
    _supervisor: ActorRef<SupervisorMsg>,
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
    type Arguments = ControllerActorArgs;

    async fn pre_start(
        &self,
        _myself: ActorRef<Self::Msg>,
        args: Self::Arguments,
    ) -> Result<Self::State, ActorProcessingErr> {
        {
            use tauri_plugin_tray::TrayPluginExt;
            let _ = args.shared.app().set_start_disabled(true);
        }

        SessionEvent::RunningActive {}
            .emit(args.shared.app())
            .unwrap();

        Ok(ControllerState {
            shared: args.shared,
            _supervisor: args.supervisor,
        })
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
                SessionEvent::MicMuted { value: muted }.emit(state.shared.app())?;
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
        }

        Ok(())
    }

    async fn post_stop(
        &self,
        _myself: ActorRef<Self::Msg>,
        state: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        {
            use tauri_plugin_tray::TrayPluginExt;
            let _ = state.shared.app().set_start_disabled(false);
        }

        SessionEvent::Inactive {}.emit(state.shared.app())?;
        tracing::info!("controller_actor_post_stop");

        Ok(())
    }
}
