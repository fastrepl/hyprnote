use crate::LocalLlmPluginExt;
use tauri_plugin_windows::HyprWindow;

pub fn on_event<R: tauri::Runtime>(app: &tauri::AppHandle<R>, event: &tauri::RunEvent) {
    match event {
        tauri::RunEvent::WindowEvent { label, event, .. } => {
            let hypr_window = match label.parse::<HyprWindow>() {
                Ok(window) => window,
                Err(e) => {
                    tracing::warn!("parse_error: {:?}", e);
                    return;
                }
            };

            if hypr_window != HyprWindow::Main {
                return;
            }

            match event {
                tauri::WindowEvent::Focused(true) => {
                    tokio::task::block_in_place(|| {
                        tokio::runtime::Handle::current().block_on(async {
                            let _ = app.start_server().await;
                        });
                    });
                }
                _ => {}
            }
        }
        _ => {}
    }
}

#[derive(serde::Serialize, Clone, specta::Type, tauri_specta::Event)]
pub enum LLMEvent {
    #[serde(rename = "progress")]
    Progress(f64),
}
