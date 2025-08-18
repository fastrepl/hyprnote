pub struct ServerHandle {
    pub base_url: String,
    api_key: Option<String>,
    shutdown: tokio::sync::watch::Sender<()>,
    child: tauri_plugin_shell::process::CommandChild,
    client: hypr_am::Client,
}

impl ServerHandle {
    pub async fn health(&self) -> bool {
        let res = self.client.status().await;
        if res.is_err() {
            return false;
        }

        matches!(res.unwrap().status, hypr_am::ServerStatusType::Ready)
    }

    pub fn terminate(self) -> Result<(), crate::Error> {
        let _ = self.shutdown.send(());
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
    let port = 8282;
    let _ = port_killer::kill(port);

    let (mut rx, child) = cmd.args(["--port", &port.to_string()]).spawn()?;
    let base_url = format!("http://localhost:{}", port);
    let (shutdown_tx, mut shutdown_rx) = tokio::sync::watch::channel(());
    let client = hypr_am::Client::new(&base_url);

    tokio::spawn(async move {
        loop {
            tokio::select! {
                _ = shutdown_rx.changed() => {
                    tracing::info!("external_server_shutdown");
                    break;
                }
                event = rx.recv() => {
                    if event.is_none() {
                        break;
                    }

                    match event.unwrap() {
                        tauri_plugin_shell::process::CommandEvent::Stdout(bytes) => {
                            if let Ok(text) = String::from_utf8(bytes) {
                                let text = text.trim();
                                tracing::info!("{}", text);
                            }
                        }
                        tauri_plugin_shell::process::CommandEvent::Stderr(bytes) => {
                            if let Ok(text) = String::from_utf8(bytes) {
                                let text = text.trim();
                                tracing::info!("{}", text);
                            }
                        }
                        _ => {}

                    }
                }
            }
        }
    });

    Ok(ServerHandle {
        api_key: Some(am_key),
        base_url,
        shutdown: shutdown_tx,
        child,
        client,
    })
}
