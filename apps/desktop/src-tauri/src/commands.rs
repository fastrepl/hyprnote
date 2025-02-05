use anyhow::Result;

use futures_util::StreamExt;
use tauri::{ipc::Channel, AppHandle, State};

use crate::{windows::ShowHyprWindow, App};

#[tauri::command]
#[specta::specta]
pub fn list_builtin_templates() -> Vec<hypr_db::user::Template> {
    hypr_template::builtins()
}

#[tauri::command]
#[specta::specta]
pub async fn run_enhance<'a>(
    app: State<'a, App>,
    req: hypr_bridge::EnhanceRequest,
    on_event: Channel<String>,
) -> Result<(), String> {
    let mut stream = app.bridge.enhance(req).await.map_err(|e| e.to_string())?;

    while let Some(event) = stream.next().await {
        if let Ok(event) = event {
            let s = String::from_utf8(event.to_vec()).unwrap();
            on_event.send(s).unwrap();
        }
    }

    Ok(())
}
