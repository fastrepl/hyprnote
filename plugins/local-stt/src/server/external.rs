use super::ServerHealth;

pub struct ServerHandle {
    pub base_url: String,
    api_key: Option<String>,
    shutdown: tokio::sync::watch::Sender<()>,
    client: hypr_am::Client,
}

// impl Drop for ServerHandle {
//     fn drop(&mut self) {
//         tracing::info!("stopping");
//         let _ = self.shutdown.send(());
//     }
// }

impl ServerHandle {
    pub async fn health(&self) -> ServerHealth {
        let res = self.client.status().await;
        if res.is_err() {
            tracing::error!("{:?}", res);
            return ServerHealth::Unreachable;
        }

        let res = res.unwrap();

        if res.model_state == hypr_am::ModelState::Loading {
            return ServerHealth::Loading;
        }

        if res.model_state == hypr_am::ModelState::Loaded {
            return ServerHealth::Ready;
        }

        ServerHealth::Unreachable
    }

    pub async fn init(
        &self,
        model: hypr_am::AmModel,
        models_dir: impl AsRef<std::path::Path>,
    ) -> Result<hypr_am::InitResponse, crate::Error> {
        let r = self
            .client
            .init(
                hypr_am::InitRequest::new(self.api_key.clone().unwrap())
                    .with_model(model, models_dir),
            )
            .await?;

        Ok(r)
    }
}

pub async fn run_server(
    cmd: tauri_plugin_shell::process::Command,
    am_key: String,
) -> Result<ServerHandle, crate::Error> {
    let port = 50060;
    let _ = port_killer::kill(port);
    tokio::time::sleep(std::time::Duration::from_millis(500)).await;

    tracing::info!("spwaning_started");
    let (mut rx, child) = cmd.args(["--port", &port.to_string()]).spawn()?;
    tracing::info!("spwaning_ended");

    let base_url = format!("http://localhost:{}", port);
    let (shutdown_tx, mut shutdown_rx) = tokio::sync::watch::channel(());
    let client = hypr_am::Client::new(&base_url);

    tokio::spawn(async move {
        let mut process_ended = false;

        loop {
            tokio::select! {
                _ = shutdown_rx.changed() => {
                    tracing::info!("shutdown_signal_received");
                    break;
                }
                event = rx.recv() => {
                    match event {
                        Some(tauri_plugin_shell::process::CommandEvent::Stdout(bytes)) => {
                            if let Ok(text) = String::from_utf8(bytes) {
                                let text = text.trim();
                                if !text.is_empty() && !text.contains("[TranscriptionHandler]") && !text.contains("[WebSocket]") && !text.contains("Sent interim") {
                                    tracing::info!("{}", text);
                                }
                            }
                        }
                        Some(tauri_plugin_shell::process::CommandEvent::Stderr(bytes)) => {
                            if let Ok(text) = String::from_utf8(bytes) {
                                let text = text.trim();
                                if !text.is_empty() && !text.contains("[TranscriptionHandler]") && !text.contains("[WebSocket]") && !text.contains("Sent interim") {
                                    tracing::info!("{}", text);
                                }
                            }
                        }
                        Some(tauri_plugin_shell::process::CommandEvent::Terminated(payload)) => {
                            tracing::error!("terminated: {:?}", payload);
                            process_ended = true;
                            break;
                        }
                        Some(tauri_plugin_shell::process::CommandEvent::Error(error)) => {
                            tracing::error!("{}", error);
                            break;
                        }
                        None => {
                            tracing::warn!("closed");
                            process_ended = true;
                            break;
                        }
                        _ => {}
                    }
                }
            }
        }

        if !process_ended {
            if let Err(e) = child.kill() {
                tracing::error!("{:?}", e);
            }
        }
    });

    tokio::time::sleep(std::time::Duration::from_millis(200)).await;
    tracing::info!("returning_handle");

    Ok(ServerHandle {
        api_key: Some(am_key),
        base_url,
        shutdown: shutdown_tx,
        client,
    })
}
