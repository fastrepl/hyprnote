pub struct ServerHandle {
    pub base_url: String,
    api_key: String,
    shutdown: tokio::sync::watch::Sender<()>,
    child: tauri_plugin_shell::process::CommandChild,
    client: hypr_am::Client,
}

impl ServerHandle {
    pub fn terminate(self) -> Result<(), crate::Error> {
        let _ = self.shutdown.send(());
        self.child.kill().map_err(|e| crate::Error::ShellError(e))?;
        Ok(())
    }

    pub async fn init(&self) -> Result<(), crate::Error> {
        let _init_result = self
            .client
            .init(
                hypr_am::InitRequest::new(self.api_key.clone())
                    .with_model(hypr_am::AmModel::WhisperSmallEn),
            )
            .await?;

        Ok(())
    }

    pub async fn status(&self) -> Result<(), crate::Error> {
        self.client.status().await?;
        Ok(())
    }
}

pub async fn run_server(
    cmd: tauri_plugin_shell::process::Command,
    am_key: String,
) -> Result<ServerHandle, crate::Error> {
    let port = 6942;
    let (_rx, child) = cmd.args(["--port", &port.to_string()]).spawn()?;

    let base_url = format!("http://localhost:{}", port);
    let (shutdown_tx, _shutdown_rx) = tokio::sync::watch::channel(());
    let client = hypr_am::Client::new(&base_url);

    Ok(ServerHandle {
        api_key: am_key,
        base_url,
        shutdown: shutdown_tx,
        child,
        client,
    })
}
