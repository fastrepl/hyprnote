use std::{io, path::PathBuf, sync::Arc};
use tauri_plugin_shell::process::{Command, CommandChild};

use super::{ServerInfo, ServerStatus};
use backon::{ConstantBuilder, Retryable};
use ractor::{Actor, ActorName, ActorProcessingErr, ActorRef, RpcReplyPort};

use crate::SupportedSttModel;
use tokio::sync::Mutex;

pub enum ExternalSTTMessage {
    GetHealth(RpcReplyPort<ServerInfo>),
    ProcessTerminated(String),
}

pub type CommandFactory = Arc<dyn Fn() -> Command + Send + Sync>;

#[derive(Clone)]
pub struct ExternalSTTArgs {
    pub cmd_factory: CommandFactory,
    pub api_key: String,
    pub model: hypr_am::AmModel,
    pub models_dir: PathBuf,
    shared_port: Arc<Mutex<Option<u16>>>,
}

impl ExternalSTTArgs {
    pub fn new(
        cmd_factory: CommandFactory,
        api_key: String,
        model: hypr_am::AmModel,
        models_dir: PathBuf,
    ) -> Self {
        Self {
            cmd_factory,
            api_key,
            model,
            models_dir,
            shared_port: Arc::new(Mutex::new(None)),
        }
    }

    pub fn from_command(
        cmd: Command,
        api_key: String,
        model: hypr_am::AmModel,
        models_dir: PathBuf,
    ) -> Self {
        let cmd_cell = Arc::new(std::sync::Mutex::new(Some(cmd)));
        let cmd_factory = Arc::new(move || {
            cmd_cell
                .lock()
                .unwrap()
                .take()
                .expect("Command can only be used once - for restart support, use ExternalSTTArgs::new with a factory function")
        });
        Self {
            cmd_factory,
            api_key,
            model,
            models_dir,
            shared_port: Arc::new(Mutex::new(None)),
        }
    }
}

pub struct ExternalSTTState {
    base_url: String,
    api_key: Option<String>,
    model: hypr_am::AmModel,
    models_dir: PathBuf,
    client: hypr_am::Client,
    process_handle: Option<CommandChild>,
    task_handle: Option<tokio::task::JoinHandle<()>>,
}

pub struct ExternalSTTActor;

impl ExternalSTTActor {
    pub fn name() -> ActorName {
        "external_stt".into()
    }
}

fn cleanup_state(state: &mut ExternalSTTState) {
    let mut kill_failed = false;

    if let Some(process) = state.process_handle.take() {
        if let Err(e) = process.kill() {
            if let tauri_plugin_shell::Error::Io(io_err) = &e {
                match io_err.kind() {
                    io::ErrorKind::InvalidInput | io::ErrorKind::NotFound => {}
                    _ => {
                        tracing::error!("failed_to_kill_process: {:?}", e);
                        kill_failed = true;
                    }
                }
            } else {
                tracing::error!("failed_to_kill_process: {:?}", e);
                kill_failed = true;
            }
        }
    }

    if kill_failed {
        hypr_host::kill_processes_by_matcher(hypr_host::ProcessMatcher::Sidecar);
    }

    if let Some(task) = state.task_handle.take() {
        task.abort();
    }
}

#[ractor::async_trait]
impl Actor for ExternalSTTActor {
    type Msg = ExternalSTTMessage;
    type State = ExternalSTTState;
    type Arguments = ExternalSTTArgs;

    async fn pre_start(
        &self,
        myself: ActorRef<Self::Msg>,
        args: Self::Arguments,
    ) -> Result<Self::State, ActorProcessingErr> {
        let ExternalSTTArgs {
            cmd_factory,
            api_key,
            model,
            models_dir,
            shared_port,
        } = args;

        let port = {
            let mut shared_port = shared_port.lock().await;
            if let Some(port) = *shared_port {
                port
            } else {
                let port = port_check::free_local_port()
                    .ok_or_else(|| ActorProcessingErr::from("failed_to_find_free_port"))?;

                *shared_port = Some(port);
                port
            }
        };

        let cmd = (cmd_factory)();
        let (mut rx, child) = cmd.args(["--port", &port.to_string()]).spawn()?;
        let base_url = format!("http://localhost:{}/v1", port);
        let client = hypr_am::Client::new(&base_url);

        let task_handle = tokio::spawn(async move {
            loop {
                match rx.recv().await {
                    Some(tauri_plugin_shell::process::CommandEvent::Stdout(bytes))
                    | Some(tauri_plugin_shell::process::CommandEvent::Stderr(bytes)) => {
                        if let Ok(text) = String::from_utf8(bytes) {
                            let text = text.trim();
                            if !text.is_empty()
                                && !text.contains("[WebSocket]")
                                && !text.contains("Sent interim text:")
                                && !text.contains("[TranscriptionHandler]")
                                && !text.contains("/v1/status")
                            {
                                tracing::info!("{}", text);
                            }
                        }
                    }
                    Some(tauri_plugin_shell::process::CommandEvent::Terminated(payload)) => {
                        let e = format!("{:?}", payload);
                        tracing::error!("{}", e);
                        let _ = myself.send_message(ExternalSTTMessage::ProcessTerminated(e));
                        break;
                    }
                    Some(tauri_plugin_shell::process::CommandEvent::Error(error)) => {
                        tracing::error!("{}", error);
                        let _ = myself.send_message(ExternalSTTMessage::ProcessTerminated(error));
                        break;
                    }
                    None => {
                        tracing::warn!("closed");
                        break;
                    }
                    _ => {}
                }
            }
        });

        Ok(ExternalSTTState {
            base_url,
            api_key: Some(api_key),
            model,
            models_dir,
            client,
            process_handle: Some(child),
            task_handle: Some(task_handle),
        })
    }
    async fn post_start(
        &self,
        _myself: ActorRef<Self::Msg>,
        state: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        let api_key = state.api_key.clone().unwrap();
        let model = state.model.clone();
        let models_dir = state.models_dir.clone();

        let res = (|| async {
            state
                .client
                .init(
                    hypr_am::InitRequest::new(api_key.clone())
                        .with_model(model.clone(), &models_dir),
                )
                .await
        })
        .retry(
            ConstantBuilder::default()
                .with_max_times(20)
                .with_delay(std::time::Duration::from_millis(500)),
        )
        .when(|e| {
            tracing::warn!("external_stt_init_failed: {:?}", e);
            true
        })
        .sleep(tokio::time::sleep)
        .await?;

        tracing::info!(res = ?res);
        Ok(())
    }

    async fn post_stop(
        &self,
        _myself: ActorRef<Self::Msg>,
        state: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        cleanup_state(state);
        Ok(())
    }

    async fn handle(
        &self,
        _myself: ActorRef<Self::Msg>,
        message: Self::Msg,
        state: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        match message {
            ExternalSTTMessage::ProcessTerminated(e) => {
                cleanup_state(state);
                Err(io::Error::new(io::ErrorKind::Other, e).into())
            }
            ExternalSTTMessage::GetHealth(reply_port) => {
                let status = match state.client.status().await {
                    Ok(r) => match r.model_state {
                        hypr_am::ModelState::Loading => ServerStatus::Loading,
                        hypr_am::ModelState::Loaded => ServerStatus::Ready,
                        _ => ServerStatus::Unreachable,
                    },
                    Err(e) => {
                        tracing::error!("{:?}", e);
                        ServerStatus::Unreachable
                    }
                };

                let info = ServerInfo {
                    url: Some(state.base_url.clone()),
                    status,
                    model: Some(SupportedSttModel::Am(state.model.clone())),
                };

                if let Err(e) = reply_port.send(info) {
                    return Err(e.into());
                }

                Ok(())
            }
        }
    }
}
