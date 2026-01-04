mod commands;
mod error;

pub use commands::{Cli, Commands};
pub use error::{Error, Result};

use std::ffi::OsString;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ExecMode {
    EarlyExit,
    NeedsAppRuntime { show_window: bool },
}

#[derive(Debug, Clone)]
pub struct Invocation {
    pub command: Option<Commands>,
}

pub fn parse<I, T>(args: I) -> std::result::Result<Invocation, clap::Error>
where
    I: IntoIterator<Item = T>,
    T: Into<OsString> + Clone,
{
    use clap::Parser;
    let cli = Cli::try_parse_from(args)?;
    Ok(Invocation {
        command: cli.command,
    })
}

pub fn exec_mode(invocation: &Invocation) -> ExecMode {
    match &invocation.command {
        Some(Commands::Bug) | Some(Commands::Web) | Some(Commands::Changelog) => {
            ExecMode::EarlyExit
        }
        Some(Commands::Update) => ExecMode::NeedsAppRuntime { show_window: false },
        None => ExecMode::NeedsAppRuntime { show_window: true },
    }
}

pub fn run_early(invocation: &Invocation) -> i32 {
    match &invocation.command {
        Some(Commands::Bug) => commands::bug::run(),
        Some(Commands::Web) => commands::web::run(),
        Some(Commands::Changelog) => commands::changelog::run(),
        _ => 0,
    }
}

pub fn generate_manpage() -> std::io::Result<Vec<u8>> {
    use clap::CommandFactory;
    let cmd = Cli::command();
    let man = clap_mangen::Man::new(cmd);
    let mut buffer: Vec<u8> = Vec::new();
    man.render(&mut buffer)?;
    Ok(buffer)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_no_args() {
        let result = parse(["hyprnote"]);
        assert!(result.is_ok());
        let inv = result.unwrap();
        assert!(inv.command.is_none());
    }

    #[test]
    fn test_parse_bug_command() {
        let result = parse(["hyprnote", "bug"]);
        assert!(result.is_ok());
        let inv = result.unwrap();
        assert!(matches!(inv.command, Some(Commands::Bug)));
    }

    #[test]
    fn test_exec_mode_early_exit() {
        let inv = Invocation {
            command: Some(Commands::Bug),
        };
        assert_eq!(exec_mode(&inv), ExecMode::EarlyExit);
    }

    #[test]
    fn test_exec_mode_needs_runtime() {
        let inv = Invocation {
            command: Some(Commands::Update),
        };
        assert_eq!(
            exec_mode(&inv),
            ExecMode::NeedsAppRuntime { show_window: false }
        );
    }

    #[test]
    fn test_exec_mode_no_command() {
        let inv = Invocation { command: None };
        assert_eq!(
            exec_mode(&inv),
            ExecMode::NeedsAppRuntime { show_window: true }
        );
    }
}
