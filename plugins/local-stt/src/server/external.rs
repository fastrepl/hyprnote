use std::path::PathBuf;
use tauri_plugin_shell::process::CommandChild;

use super::ServerHealth;
use backon::{ConstantBuilder, Retryable};
use ractor::{Actor, ActorName, ActorProcessingErr, ActorRef, RpcReplyPort};

pub enum ExternalSTTMessage {
    GetHealth(RpcReplyPort<(String, ServerHealth)>),
    ProcessTerminated(String),
}

pub struct ExternalSTTArgs {
    pub app: tauri::AppHandle,
    pub api_key: String,
    pub model: hypr_am::AmModel,
    pub models_dir: PathBuf,
}

pub struct ExternalSTTState {
    args: ExternalSTTArgs,
    base_url: String,
    client: hypr_am::Client,
    process_handle: Option<CommandChild>,
    task_handle: Option<tokio::task::JoinHandle<()>>,
}

pub struct ExternalSTTActor;

impl ExternalSTTActor {
    pub fn name() -> ActorName {
        "external_stt".into()
    }

    fn build_cmd<R: tauri::Runtime>(
        app: &tauri::AppHandle<R>,
    ) -> Result<tauri_plugin_shell::process::Command, crate::Error> {
        use tauri_plugin_shell::ShellExt;

        let cmd: tauri_plugin_shell::process::Command = {
            #[cfg(debug_assertions)]
            {
                let passthrough_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join(
                    "../../apps/desktop/src-tauri/resources/passthrough-aarch64-apple-darwin",
                );
                let stt_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
                    .join("../../apps/desktop/src-tauri/resources/stt-aarch64-apple-darwin");

                if !passthrough_path.exists() || !stt_path.exists() {
                    return Err(crate::Error::AmBinaryNotFound);
                }

                app.shell()
                    .command(passthrough_path)
                    .current_dir(dirs::home_dir().unwrap())
                    .arg(stt_path)
                    .args(["serve", "-v", "-d"])
            }

            #[cfg(not(debug_assertions))]
            app.shell()
                .sidecar("stt")?
                .current_dir(dirs::home_dir().unwrap())
                .args(["serve"])
        };

        Ok(cmd)
    }
}

impl Actor for ExternalSTTActor {
    type Msg = ExternalSTTMessage;
    type State = ExternalSTTState;
    type Arguments = ExternalSTTArgs;

    async fn pre_start(
        &self,
        myself: ActorRef<Self::Msg>,
        args: Self::Arguments,
    ) -> Result<Self::State, ActorProcessingErr> {
        let cmd = Self::build_cmd(&args.app).unwrap();

        let port = port_check::free_local_port().unwrap();
        let (mut rx, child) = cmd.args(["--port", &port.to_string()]).spawn()?;
        let base_url = format!("http://localhost:{}", port);
        let client = hypr_am::Client::new(&base_url);

        let task_handle = tokio::spawn(async move {
            loop {
                match rx.recv().await {
                    Some(tauri_plugin_shell::process::CommandEvent::Stdout(bytes))
                    | Some(tauri_plugin_shell::process::CommandEvent::Stderr(bytes)) => {
                        if let Ok(text) = String::from_utf8(bytes) {
                            let text = text.trim();
                            if !text.is_empty()
                                && !text.contains("[TranscriptionHandler]")
                                && !text.contains("[WebSocket]")
                                && !text.contains("Sent interim")
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
            args,
            base_url,
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
        let api_key = state.args.api_key.clone();
        let model = state.args.model.clone();
        let models_dir = state.args.models_dir.clone();

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
            tracing::error!("external_stt_init_failed: {:?}", e);
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
        if let Some(process) = state.process_handle.take() {
            if let Err(e) = process.kill() {
                tracing::error!("failed_to_kill_process: {:?}", e);
            }
        }

        if let Some(task) = state.task_handle.take() {
            task.abort();
        }

        hypr_host::kill_processes_by_matcher(hypr_host::ProcessMatcher::Sidecar);

        Ok(())
    }

    async fn handle(
        &self,
        myself: ActorRef<Self::Msg>,
        message: Self::Msg,
        state: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        match message {
            ExternalSTTMessage::ProcessTerminated(e) => {
                myself.stop(Some(e));
                Ok(())
            }
            ExternalSTTMessage::GetHealth(reply_port) => {
                let status = match state.client.status().await {
                    Ok(r) => match r.model_state {
                        hypr_am::ModelState::Loading => ServerHealth::Loading,
                        hypr_am::ModelState::Loaded => ServerHealth::Ready,
                        _ => ServerHealth::Unreachable,
                    },
                    Err(e) => {
                        tracing::error!("{:?}", e);
                        ServerHealth::Unreachable
                    }
                };

                if let Err(e) = reply_port.send((state.base_url.clone(), status)) {
                    return Err(e.into());
                }

                Ok(())
            }
        }
    }
}
