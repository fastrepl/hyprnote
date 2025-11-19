use std::ffi::OsString;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct AfterListeningStoppedArgs {
    pub session_id: String,
}

impl AfterListeningStoppedArgs {
    fn to_cli_args(&self) -> Vec<OsString> {
        vec![
            OsString::from("--session-id"),
            OsString::from(&self.session_id),
        ]
    }
}

#[derive(Debug, Clone)]
pub enum HookEvent {
    AfterListeningStopped(AfterListeningStoppedArgs),
}

impl HookEvent {
    pub fn condition_key(&self) -> &'static str {
        match self {
            HookEvent::AfterListeningStopped(_) => "afterListeningStopped",
        }
    }

    pub fn cli_args(&self) -> Vec<OsString> {
        match self {
            HookEvent::AfterListeningStopped(args) => args.to_cli_args(),
        }
    }
}

pub trait HooksPluginExt<R: tauri::Runtime> {
    fn ping(&self, value: Option<String>) -> Result<Option<String>, crate::Error>;
    fn run_hooks(&self, event: HookEvent) -> crate::Result<()>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> crate::HooksPluginExt<R> for T {
    fn ping(&self, value: Option<String>) -> Result<Option<String>, crate::Error> {
        Ok(value)
    }

    fn run_hooks(&self, event: HookEvent) -> crate::Result<()> {
        let config = crate::config::HooksConfig::load(self)?;

        let condition_key = event.condition_key();
        let cli_args = event.cli_args();

        let hooks = config.hooks.get(condition_key);

        if let Some(hooks) = hooks {
            tracing::debug!(
                "running {} hook(s) for event: {}",
                hooks.len(),
                condition_key
            );

            for hook_def in hooks {
                let command = hook_def.command.clone();
                let args = cli_args.clone();

                tauri::async_runtime::spawn(async move {
                    let result = execute_hook(&command, &args).await;
                    if let Err(e) = result {
                        tracing::error!("hook execution failed for command '{}': {}", command, e);
                    }
                });
            }
        } else {
            tracing::debug!("no hooks configured for event: {}", condition_key);
        }

        Ok(())
    }
}

async fn execute_hook(command: &str, args: &[OsString]) -> crate::Result<()> {
    use tokio::process::Command;

    let parts: Vec<&str> = command.split_whitespace().collect();
    if parts.is_empty() {
        return Err(crate::Error::HookExecution("empty command".to_string()));
    }

    let program = parts[0];
    let mut cmd = Command::new(program);

    if parts.len() > 1 {
        cmd.args(&parts[1..]);
    }

    cmd.args(args);

    tracing::debug!("executing hook: {:?} with args: {:?}", command, args);

    let output = cmd.output().await.map_err(|e| {
        crate::Error::HookExecution(format!("failed to spawn command '{}': {}", command, e))
    })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        tracing::warn!(
            "hook command '{}' exited with non-zero status: {}. stderr: {}",
            command,
            output.status,
            stderr
        );
    } else {
        tracing::debug!("hook command '{}' completed successfully", command);
    }

    Ok(())
}
