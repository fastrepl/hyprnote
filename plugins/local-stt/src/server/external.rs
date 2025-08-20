use super::ServerHealth;

pub struct ServerHandle {
    pub base_url: String,
    api_key: Option<String>,
    shutdown: tokio::sync::watch::Sender<()>,
    child: tauri_plugin_shell::process::CommandChild,
    client: hypr_am::Client,
}

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

    pub fn terminate(self) -> Result<(), crate::Error> {
        let _ = self.shutdown.send(());
        std::thread::sleep(std::time::Duration::from_millis(250));
        self.child.kill().map_err(|e| crate::Error::ShellError(e))?;
        Ok(())
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

    if port_killer::kill(port).is_ok() {
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;
    }

    let (mut rx, child) = cmd.args(["--port", &port.to_string()]).spawn()?;
    let base_url = format!("http://localhost:{}", port);
    let (shutdown_tx, mut shutdown_rx) = tokio::sync::watch::channel(());
    let client = hypr_am::Client::new(&base_url);

    tokio::spawn(async move {
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
                                if !text.is_empty() {
                                    tracing::info!("{}", text);
                                }
                            }
                        }
                        Some(tauri_plugin_shell::process::CommandEvent::Stderr(bytes)) => {
                            if let Ok(text) = String::from_utf8(bytes) {
                                let text = text.trim();
                                if !text.is_empty() {
                                    tracing::info!("{}", text);
                                }
                            }
                        }
                        Some(tauri_plugin_shell::process::CommandEvent::Terminated(payload)) => {
                            // Only log error if it's not a normal exit (code 0)
                            if payload.code != Some(0) {
                                tracing::error!("Server process terminated unexpectedly: {:?}", payload);
                            }
                            break;
                        }
                        Some(tauri_plugin_shell::process::CommandEvent::Error(error)) => {
                            tracing::error!("{}", error);
                            break;
                        }
                        None => {
                            tracing::warn!("closed");
                            break;
                        }
                        _ => {}
                    }
                }
            }
        }
    });

    // Wait a bit for server to start up before returning
    // The server needs time to bind to the port and initialize
    tokio::time::sleep(std::time::Duration::from_millis(1000)).await;

    // Verify the server started successfully by checking if we can connect
    // But don't check status as it may require initialization first
    match client.status().await {
        Ok(_) => {
            tracing::info!("Server is ready and responding");
        }
        Err(e) => {
            // Server may need initialization, which happens after this function returns
            // Just log the status check result
            tracing::info!("Server status check: {:?} (may need initialization)", e);
        }
    }

    Ok(ServerHandle {
        api_key: Some(am_key),
        base_url,
        shutdown: shutdown_tx,
        child,
        client,
    })
}
