use clap::{Parser, Subcommand};

mod commands;
mod misc;
mod server;
mod utils;

use server::*;
use utils::*;

#[derive(Parser)]
#[command(version, name = "OWhisper", bin_name = "owhisper")]
struct Args {
    #[command(subcommand)]
    cmd: Commands,
}

#[derive(Subcommand)]
enum Commands {
    #[command(about = "Redirect to the GitHub README")]
    Readme(commands::ReadmeArgs),
    #[command(about = "Print out the global config")]
    Config(commands::ConfigArgs),
    #[command(about = "Print out downloaded models")]
    Models(commands::ModelsArgs),
    #[command(about = "Download the model")]
    Pull(commands::PullArgs),
    #[command(about = "Run the server")]
    Run(commands::RunArgs),
    #[command(about = "Start the server")]
    Serve(commands::ServeArgs),
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    rustls::crypto::ring::default_provider()
        .install_default()
        .unwrap();

    misc::set_logger();

    let args = Args::parse();

    let result = match args.cmd {
        Commands::Readme(args) => commands::handle_readme(args).await,
        Commands::Config(args) => commands::handle_config(args).await,
        Commands::Models(args) => commands::handle_models(args).await,
        Commands::Pull(args) => commands::handle_pull(args).await,
        Commands::Run(args) => commands::handle_run(args).await,
        Commands::Serve(args) => commands::handle_serve(args).await,
    };

    if let Err(e) = result {
        log::error!("{}", e);
        std::process::exit(1);
    }

    Ok(())
}
