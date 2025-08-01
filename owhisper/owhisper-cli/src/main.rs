use clap::{CommandFactory, FromArgMatches, Parser, Subcommand};
use clap_autocomplete::{add_subcommand, test_subcommand};

mod commands;

#[derive(Parser)]
#[command(name = "owhisper")]
#[command(about = "A CLI tool for audio transcription")]
struct Args {
    #[command(subcommand)]
    cmd: Commands,
}

#[derive(Subcommand)]
enum Commands {
    Serve(commands::ServeArgs),
    Readme(commands::ReadmeArgs),
    Pull(commands::PullArgs),
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut command = Args::command();
    command = add_subcommand(command);

    let command_copy = command.clone();
    let matches = command.get_matches();

    if let Some(result) = test_subcommand(&matches, command_copy) {
        if let Err(err) = result {
            eprintln!("Insufficient permissions: {err}");
            std::process::exit(1);
        } else {
            std::process::exit(0);
        }
    }

    let args = Args::from_arg_matches(&matches).unwrap();

    match args.cmd {
        Commands::Serve(args) => {
            commands::handle_serve(args).await.unwrap();
        }
        Commands::Readme(args) => {
            commands::handle_readme(args).await.unwrap();
        }
        Commands::Pull(args) => {
            commands::handle_pull(args).await.unwrap();
        }
    }

    Ok(())
}
