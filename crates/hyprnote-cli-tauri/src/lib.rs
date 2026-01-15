mod update;

use hyprnote_cli::{Commands, Invocation};
use tauri::AppHandle;

pub async fn run_with_app<R: tauri::Runtime>(app: &AppHandle<R>, invocation: &Invocation) -> i32 {
    match &invocation.command {
        Some(Commands::Update) => update::run(app).await,
        _ => 0,
    }
}
