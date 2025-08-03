use crate::server::Server;

#[derive(clap::Args)]
pub struct ServeArgs {
    #[arg(short, long)]
    pub config: String,
    #[arg(short, long)]
    pub port: Option<u16>,
}

pub async fn handle_serve(args: ServeArgs) -> anyhow::Result<()> {
    let config = owhisper_config::Config::new(&args.config);
    let server = Server::new(config, args.port);
    server.run().await
}
