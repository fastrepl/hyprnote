pub mod bug;
pub mod changelog;
pub mod web;

use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(
    name = "hyprnote",
    version,
    about = "AI-powered notetaking for meetings"
)]
pub struct Cli {
    #[command(subcommand)]
    pub command: Option<Commands>,
}

#[derive(Subcommand, Debug, Clone)]
pub enum Commands {
    #[command(about = "Open GitHub issues page to report a bug")]
    Bug,
    #[command(about = "Open https://hyprnote.com")]
    Web,
    #[command(about = "Open the changelog page")]
    Changelog,
    #[command(about = "Check for updates and install if available")]
    Update,
}
