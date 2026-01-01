use hyprnote_cli::{ExecMode, Invocation};
use tauri::AppHandle;

pub use hyprnote_cli::ExecMode as EarlyCliExecMode;

pub enum EarlyCliResult {
    Exit(i32),
    Continue,
    ContinueWithoutWindow,
}

const TAURI_INTERNAL_ARGS: &[&str] = &["--crash-reporter-server"];

fn filter_tauri_internal_args(args: Vec<String>) -> Vec<String> {
    let mut filtered = Vec::new();
    let mut skip_next = false;

    for arg in args {
        if skip_next {
            skip_next = false;
            continue;
        }

        let is_internal = TAURI_INTERNAL_ARGS
            .iter()
            .any(|internal| arg == *internal || arg.starts_with(&format!("{internal}=")));

        if is_internal {
            if !arg.contains('=') {
                skip_next = true;
            }
            continue;
        }

        filtered.push(arg);
    }

    filtered
}

pub struct ParsedCli {
    pub exec_mode: ExecMode,
    pub invocation: Invocation,
}

pub fn parse_cli_early() -> ParsedCli {
    let raw_args: Vec<String> = std::env::args().collect();
    let args = filter_tauri_internal_args(raw_args);

    match hyprnote_cli::parse(&args) {
        Ok(invocation) => {
            let exec_mode = hyprnote_cli::exec_mode(&invocation);
            ParsedCli {
                exec_mode,
                invocation,
            }
        }
        Err(e) => {
            e.print().ok();
            std::process::exit(e.exit_code());
        }
    }
}

pub fn handle_cli_early() -> EarlyCliResult {
    let parsed = parse_cli_early();

    match parsed.exec_mode {
        ExecMode::EarlyExit => {
            let code = hyprnote_cli::run_early(&parsed.invocation);
            EarlyCliResult::Exit(code)
        }
        ExecMode::NeedsAppRuntime { show_window } => {
            if show_window {
                EarlyCliResult::Continue
            } else {
                EarlyCliResult::ContinueWithoutWindow
            }
        }
    }
}

pub fn handle_cli_early_with_invocation() -> (EarlyCliResult, Option<Invocation>) {
    let parsed = parse_cli_early();

    match parsed.exec_mode {
        ExecMode::EarlyExit => {
            let code = hyprnote_cli::run_early(&parsed.invocation);
            (EarlyCliResult::Exit(code), None)
        }
        ExecMode::NeedsAppRuntime { show_window } => {
            let result = if show_window {
                EarlyCliResult::Continue
            } else {
                EarlyCliResult::ContinueWithoutWindow
            };
            (result, Some(parsed.invocation))
        }
    }
}

pub fn handle_cli_args<R: tauri::Runtime>(app: &AppHandle<R>, argv: Vec<String>) -> bool {
    let args = filter_tauri_internal_args(argv);

    if args.len() <= 1 {
        return true;
    }

    match hyprnote_cli::parse(&args) {
        Ok(invocation) => {
            let exec_mode = hyprnote_cli::exec_mode(&invocation);
            match exec_mode {
                ExecMode::EarlyExit => {
                    let code = hyprnote_cli::run_early(&invocation);
                    std::process::exit(code);
                }
                ExecMode::NeedsAppRuntime { show_window } => {
                    let app_clone = app.clone();
                    tauri::async_runtime::block_on(async move {
                        let code = hyprnote_cli_tauri::run_with_app(&app_clone, &invocation).await;
                        std::process::exit(code);
                    });
                    show_window
                }
            }
        }
        Err(_) => true,
    }
}

pub fn generate_manpage() -> std::io::Result<Vec<u8>> {
    hyprnote_cli::generate_manpage()
}
