mod commands;

use clap::Parser;
use commands::{CreateArgs, ListArgs};

#[derive(Parser)]
#[command(about)]
struct Args {
    #[command(subcommand)]
    cmd: Commands,
}

#[derive(clap::Subcommand)]
enum Commands {
    Create(CreateArgs),
    List(ListArgs),
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let args = Args::parse();

    match args.cmd {
        Commands::Create(create_args) => commands::handle_create(create_args),
        Commands::List(list_args) => commands::handle_list(list_args),
    }
}

pub fn get_project_root_path() -> std::path::PathBuf {
    let cur = env!("CARGO_MANIFEST_DIR");
    std::path::Path::new(cur).join("../../")
}

pub fn get_extensions_path() -> std::path::PathBuf {
    get_project_root_path().join("extensions")
}
