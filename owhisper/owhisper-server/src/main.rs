use clap::{Parser, Subcommand};

mod commands;
mod server;

#[derive(Parser)]
#[command(name = "owhisper")]
#[command(about = "A CLI tool for audio transcription")]
struct Args {
    #[command(subcommand)]
    cmd: Commands,
}

#[derive(Subcommand)]
enum Commands {
    Readme(commands::ReadmeArgs),
    Pull(commands::PullArgs),
    Run(commands::RunArgs),
    Serve(commands::ServeArgs),
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args = Args::parse();

    match args.cmd {
        Commands::Readme(args) => {
            commands::handle_readme(args).await.unwrap();
        }
        Commands::Pull(args) => {
            commands::handle_pull(args).await.unwrap();
        }
        Commands::Run(args) => {
            commands::handle_run(args).await.unwrap();
        }
        Commands::Serve(args) => {
            commands::handle_serve(args).await.unwrap();
        }
    }

    Ok(())
}
