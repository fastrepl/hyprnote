use crate::server::Server;

#[derive(clap::Parser)]
pub struct RunArgs {
    #[arg(short, long)]
    pub model: String,
}

pub async fn handle_run(_args: RunArgs) -> anyhow::Result<()> {
    // TODO
    let config = owhisper_config::Config::default();
    let server = Server::new(config, None);
    server.run().await
}
