#[derive(Clone)]
pub struct ServerHandle {
    pub api_base: String,
    pub shutdown: tokio::sync::watch::Sender<()>,
    client: Option<hypr_am::AmClient>,
}

pub async fn run_server(
    cmd: tauri_plugin_shell::process::Command,
) -> Result<ServerHandle, crate::Error> {
    let (_rx, _child) = cmd.args(["serve", "--port", "6942"]).spawn()?;

    let api_base = "http://localhost:6942";
    let client = hypr_am::AmClient::new(api_base);

    Ok(ServerHandle {
        api_base: api_base.to_string(),
        client: Some(client),
        shutdown: tokio::sync::watch::channel(()).0,
    })
}
