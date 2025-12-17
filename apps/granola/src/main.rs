use std::path::PathBuf;
use std::time::Duration;

use clap::{Parser, Subcommand};
use hypr_granola::{
    NotesConfig, TranscriptsConfig, cache::default_cache_path, default_supabase_path, export_notes,
    export_transcripts,
};

#[derive(Parser)]
#[command(name = "granola")]
#[command(about = "Export your Granola notes and transcripts to local files")]
#[command(version)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    #[command(about = "Export notes from Granola API to local markdown files")]
    Notes {
        #[arg(short, long, help = "Path to supabase.json file", value_name = "PATH")]
        supabase: Option<PathBuf>,

        #[arg(
            short,
            long,
            default_value = "notes",
            help = "Output directory for exported notes",
            value_name = "DIR"
        )]
        output: PathBuf,

        #[arg(
            short,
            long,
            default_value = "30",
            help = "Request timeout in seconds",
            value_name = "SECONDS"
        )]
        timeout: u64,
    },

    #[command(about = "Export transcripts from local cache to text files")]
    Transcripts {
        #[arg(short, long, help = "Path to cache-v3.json file", value_name = "PATH")]
        cache: Option<PathBuf>,

        #[arg(
            short,
            long,
            default_value = "transcripts",
            help = "Output directory for exported transcripts",
            value_name = "DIR"
        )]
        output: PathBuf,
    },
}

fn notes(
    supabase: Option<PathBuf>,
    output: PathBuf,
    timeout: u64,
) -> Result<(), hypr_granola::error::Error> {
    let supabase_path = supabase.unwrap_or_else(default_supabase_path);

    let config = NotesConfig {
        supabase_path,
        output_dir: output,
        timeout: Duration::from_secs(timeout),
    };

    let rt = tokio::runtime::Runtime::new().expect("Failed to create tokio runtime");
    let count = rt.block_on(export_notes(&config))?;

    println!("Exported {} notes", count);
    Ok(())
}

fn transcripts(cache: Option<PathBuf>, output: PathBuf) -> Result<(), hypr_granola::error::Error> {
    let cache_path = cache.unwrap_or_else(default_cache_path);

    let config = TranscriptsConfig {
        cache_path,
        output_dir: output,
    };

    let count = export_transcripts(&config)?;

    println!("Exported {} transcripts", count);
    Ok(())
}

fn main() {
    let cli = Cli::parse();

    let result = match cli.command {
        Commands::Notes {
            supabase,
            output,
            timeout,
        } => notes(supabase, output, timeout),
        Commands::Transcripts { cache, output } => transcripts(cache, output),
    };

    if let Err(e) = result {
        eprintln!("Error: {}", e);
        std::process::exit(1);
    }
}
