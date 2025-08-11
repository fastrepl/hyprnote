pub struct ServerHandle {
    pub api_base: String,
    pub shutdown: tokio::sync::watch::Sender<()>,
    child: tauri_plugin_shell::process::CommandChild,
}

impl ServerHandle {
    pub fn terminate(self) -> Result<(), crate::Error> {
        let _ = self.shutdown.send(());
        self.child.kill().map_err(|e| crate::Error::ShellError(e))?;
        Ok(())
    }
}

pub async fn run_server(
    cmd: tauri_plugin_shell::process::Command,
) -> Result<ServerHandle, crate::Error> {
    let (_rx, child) = cmd.args(["--port", "6942"]).spawn()?;

    let api_base = "http://localhost:6942";
    let (shutdown_tx, _shutdown_rx) = tokio::sync::watch::channel(());

    Ok(ServerHandle {
        api_base: api_base.to_string(),
        shutdown: shutdown_tx,
        child,
    })
}
