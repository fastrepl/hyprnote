use clap::{CommandFactory, Parser, Subcommand};
use tauri::AppHandle;
use tauri_plugin_updater::UpdaterExt;

/// Result of early CLI argument handling.
/// This is called before single-instance plugin takes over.
pub enum EarlyCliResult {
    /// CLI command was handled and process should exit with the given code
    Exit(i32),
    /// No CLI command detected, continue with normal app startup
    Continue,
    /// CLI command detected but needs app to run (e.g., update command)
    /// The bool indicates whether to show the window
    ContinueWithoutWindow,
}

#[derive(Parser)]
#[command(
    name = "hyprnote",
    version,
    about = "AI-powered notetaking for meetings"
)]
struct Cli {
    #[command(subcommand)]
    command: Option<Commands>,
}

#[derive(Subcommand)]
enum Commands {
    /// Open GitHub issues page to report a bug
    Bug,
    /// Open https://hyprnote.com
    Web,
    /// Open the changelog page
    Changelog,
    /// Check for updates and install if available
    Update,
}

/// Known Tauri-internal arguments that should be filtered out before CLI parsing.
/// These are passed by Tauri/Sentry and are not user-facing CLI arguments.
const TAURI_INTERNAL_ARGS: &[&str] = &["--crash-reporter-server"];

/// Get the actual binary name from the current executable path.
fn get_binary_name() -> Option<String> {
    std::env::args().next().and_then(|p| {
        std::path::Path::new(&p)
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
    })
}

/// Filter out Tauri-internal arguments from the argument list.
/// Handles both `--flag value` and `--flag=value` formats.
fn filter_tauri_internal_args(args: Vec<String>) -> Vec<String> {
    let mut filtered = Vec::new();
    let mut skip_next = false;

    for arg in args {
        if skip_next {
            skip_next = false;
            continue;
        }

        // Check if this arg is a Tauri internal arg
        let is_internal = TAURI_INTERNAL_ARGS
            .iter()
            .any(|internal| arg == *internal || arg.starts_with(&format!("{internal}=")));

        if is_internal {
            // If it's `--flag value` format (no =), skip the next arg too
            if !arg.contains('=') {
                skip_next = true;
            }
            continue;
        }

        filtered.push(arg);
    }

    filtered
}

/// Handle CLI arguments early, before single-instance plugin takes over.
/// This ensures CLI commands work regardless of whether the app is already running.
pub fn handle_cli_early() -> EarlyCliResult {
    let raw_args: Vec<String> = std::env::args().collect();
    let args = filter_tauri_internal_args(raw_args);

    if args.len() <= 1 {
        return EarlyCliResult::Continue;
    }

    let first_arg = args.get(1).map(|s| s.as_str()).unwrap_or("");

    if first_arg == "--help" || first_arg == "-h" {
        // Use try_parse_from to let clap handle help with correct binary name from args[0]
        let _ = Cli::try_parse_from(&args);
        return EarlyCliResult::Exit(0);
    }

    // Handle --version using clap's generated version
    if first_arg == "--version" || first_arg == "-V" {
        let bin_name = get_binary_name().unwrap_or_else(|| "hyprnote".to_string());
        let version = env!("CARGO_PKG_VERSION");
        println!("{bin_name} {version}");
        return EarlyCliResult::Exit(0);
    }

    // Try to parse the filtered CLI args
    match Cli::try_parse_from(&args) {
        Ok(cli) => match cli.command {
            Some(Commands::Bug) => {
                let version = env!("CARGO_PKG_VERSION");
                let url = format!(
                    "https://github.com/fastrepl/hyprnote/issues/new?labels=bug,v{version}"
                );
                match open::that(&url) {
                    Ok(_) => EarlyCliResult::Exit(0),
                    Err(e) => {
                        eprintln!("Failed to open URL: {e}");
                        EarlyCliResult::Exit(1)
                    }
                }
            }
            Some(Commands::Web) => match open::that("https://hyprnote.com") {
                Ok(_) => EarlyCliResult::Exit(0),
                Err(e) => {
                    eprintln!("Failed to open URL: {e}");
                    EarlyCliResult::Exit(1)
                }
            },
            Some(Commands::Changelog) => match open::that("https://hyprnote.com/changelog") {
                Ok(_) => EarlyCliResult::Exit(0),
                Err(e) => {
                    eprintln!("Failed to open URL: {e}");
                    EarlyCliResult::Exit(1)
                }
            },
            Some(Commands::Update) => {
                // Update command needs the full app to run
                EarlyCliResult::ContinueWithoutWindow
            }
            None => EarlyCliResult::Continue,
        },
        Err(e) => {
            // If parsing fails, let clap handle the error display
            e.print().ok();
            EarlyCliResult::Exit(e.exit_code())
        }
    }
}

/// Handle CLI arguments when the app is already running (single-instance callback).
/// Returns true if the main window should be shown, false otherwise.
pub fn handle_cli_args<R: tauri::Runtime>(app: &AppHandle<R>, argv: Vec<String>) -> bool {
    let args = filter_tauri_internal_args(argv);

    if args.len() <= 1 {
        return true;
    }

    match Cli::try_parse_from(&args) {
        Ok(cli) => match cli.command {
            Some(Commands::Bug) => {
                let version = app.package_info().version.to_string();
                open_url(format!(
                    "https://github.com/fastrepl/hyprnote/issues/new?labels=bug,v{version}"
                ));
                false
            }
            Some(Commands::Web) => {
                open_url("https://hyprnote.com");
                false
            }
            Some(Commands::Changelog) => {
                open_url("https://hyprnote.com/changelog");
                false
            }
            Some(Commands::Update) => {
                update(app);
                false
            }
            None => true,
        },
        Err(_) => true,
    }
}

fn open_url(url: impl Into<String>) {
    match open::that(url.into()) {
        Ok(_) => std::process::exit(0),
        Err(e) => {
            tracing::error!("open_url_error: {e}");
            std::process::exit(1);
        }
    }
}

/// Generate the CLI manpage content as a string.
/// This can be used to export the manpage for documentation.
pub fn generate_manpage() -> std::io::Result<Vec<u8>> {
    let cmd = Cli::command();
    let man = clap_mangen::Man::new(cmd);
    let mut buffer: Vec<u8> = Vec::new();
    man.render(&mut buffer)?;
    Ok(buffer)
}

fn update<R: tauri::Runtime>(app: &AppHandle<R>) {
    let app_clone = app.clone();
    tauri::async_runtime::block_on(async move {
        let updater = match app_clone.updater() {
            Ok(updater) => updater,
            Err(e) => {
                eprintln!("Failed to initialize updater: {e}");
                std::process::exit(1);
            }
        };

        println!("Checking for updates...");

        match updater.check().await {
            Ok(Some(update)) => {
                println!("Update available: v{}", update.version);
                if let Some(body) = &update.body {
                    println!("\nRelease notes:\n{body}");
                }

                println!("\nDownloading update...");
                match update.download_and_install(|_, _| {}, || {}).await {
                    Ok(_) => {
                        println!("Update installed successfully. Please restart the application.");
                        std::process::exit(0);
                    }
                    Err(e) => {
                        eprintln!("Failed to install update: {e}");
                        std::process::exit(1);
                    }
                }
            }
            Ok(None) => {
                println!("Already up to date.");
                std::process::exit(0);
            }
            Err(e) => {
                eprintln!("Failed to check for updates: {e}");
                std::process::exit(1);
            }
        }
    });
}
