use crate::{misc::print_logo, server::Server};

#[derive(clap::Args)]
pub struct ServeArgs {
    #[arg(short, long)]
    pub config: String,
    #[arg(short, long)]
    pub port: Option<u16>,
}

pub async fn handle_serve(args: ServeArgs) -> anyhow::Result<()> {
    print_logo();

    let config = owhisper_config::Config::new(Some(&args.config));
    let server = Server::new(config, args.port);
    let handle = server.run().await;

    let api_base = "TODO";
    let api_key = "TODO";

    let client = owhisper_client::ListenClient::builder()
        .api_base(api_base)
        .api_key(api_key)
        .params(owhisper_interface::ListenParams {
            ..Default::default()
        })
        .build_single();

    Ok(())
}
