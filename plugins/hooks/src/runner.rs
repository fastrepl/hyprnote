use std::ffi::OsString;

use crate::{config::HooksConfig, event::HookEvent};

pub fn run_hooks_for_event<R: tauri::Runtime>(
    app: &impl tauri::Manager<R>,
    event: HookEvent,
) -> crate::Result<()> {
    let config = HooksConfig::load(app)?;
    let condition_key = event.condition_key();
    let cli_args = event.cli_args();

    let Some(hooks) = config.hooks.get(condition_key) else {
        return Ok(());
    };

    let futures: Vec<_> = hooks
        .iter()
        .map(|hook_def| {
            let command = hook_def.command.clone();
            let args = cli_args.clone();
            async move { execute_hook(&command, &args).await }
        })
        .collect();

    tauri::async_runtime::spawn(async move {
        let _ = futures_util::future::join_all(futures).await;
    });

    Ok(())
}

async fn execute_hook(command: &str, args: &[OsString]) -> crate::Result<()> {
    use tokio::process::Command;

    let parts: Vec<&str> = command.split_whitespace().collect();
    if parts.is_empty() {
        return Err(crate::Error::HookExecution("empty command".to_string()));
    }

    let mut cmd = Command::new(parts[0]);

    if parts.len() > 1 {
        cmd.args(&parts[1..]);
    }

    cmd.args(args);

    let output = cmd.output().await.map_err(|e| {
        crate::Error::HookExecution(format!("failed to spawn command '{}': {}", command, e))
    })?;

    if !output.status.success() {
        return Err(crate::Error::HookExecution(format!(
            "command '{}' exited with status: {}",
            command, output.status
        )));
    }

    Ok(())
}
