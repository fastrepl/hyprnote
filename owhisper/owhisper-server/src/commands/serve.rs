use crate::{
    misc::{print_logo, shutdown_signal},
    server::Server,
};

#[derive(clap::Args)]
pub struct ServeArgs {
    #[arg(short, long)]
    pub config: Option<String>,
    #[arg(short, long)]
    pub port: Option<u16>,
}

pub async fn handle_serve(args: ServeArgs) -> anyhow::Result<()> {
    print_logo();

    let config = owhisper_config::Config::new(args.config)?;
    let server = Server::new(config, args.port);
    server.run_with_shutdown(shutdown_signal()).await?;
    Ok(())
}
