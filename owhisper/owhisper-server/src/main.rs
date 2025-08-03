use clap::{Parser, Subcommand};

mod commands;
mod misc;
mod server;

use server::*;

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
    #[command(about = "Download the model")]
    Pull(commands::PullArgs),
    #[command(about = "Run the server")]
    Run(commands::RunArgs),
    #[command(about = "Start the server")]
    Serve(commands::ServeArgs),
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    misc::set_logger();

    let args = Args::parse();

    let result = match args.cmd {
        Commands::Readme(args) => commands::handle_readme(args).await,
        Commands::Pull(args) => commands::handle_pull(args).await,
        Commands::Run(args) => commands::handle_run(args).await,
        Commands::Serve(args) => commands::handle_serve(args).await,
    };

    if result.is_err() {
        log::error!("{}", result.unwrap_err());
    }

    Ok(())
}
