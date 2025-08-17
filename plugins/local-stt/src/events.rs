use tauri::Manager;

use crate::{LocalSttPluginExt, SharedState};
use tauri_plugin_windows::HyprWindow;

pub fn on_event<R: tauri::Runtime>(app: &tauri::AppHandle<R>, event: &tauri::RunEvent) {
    let state = app.state::<SharedState>();

    match event {
        tauri::RunEvent::ExitRequested { .. } | tauri::RunEvent::Exit => {
            tokio::task::block_in_place(|| {
                tokio::runtime::Handle::current().block_on(async {
                    let mut guard = state.lock().await;

                    if let Some(server) = guard.internal_server.take() {
                        let _ = server.terminate();
                        guard.internal_server = None;
                    }
                    if let Some(server) = guard.external_server.take() {
                        let _ = server.terminate();
                        guard.external_server = None;
                    }
                    for (_, task) in guard.download_task.drain() {
                        task.abort();
                    }
                });
            });
        }
        tauri::RunEvent::WindowEvent { label, event, .. } => {
            let hypr_window = match label.parse::<HyprWindow>() {
                Ok(window) => window,
                Err(e) => {
                    tracing::warn!("window_parse_error: {:?}", e);
                    return;
                }
            };

            if hypr_window != HyprWindow::Main {
                return;
            }

            match event {
                tauri::WindowEvent::CloseRequested { .. } | tauri::WindowEvent::Destroyed => {
                    tokio::task::block_in_place(|| {
                        tokio::runtime::Handle::current().block_on(async {
                            let mut guard = state.lock().await;

                            if let Some(server) = guard.internal_server.take() {
                                let _ = server.terminate();
                                guard.internal_server = None;
                            }
                            if let Some(server) = guard.external_server.take() {
                                let _ = server.terminate();
                                guard.external_server = None;
                            }
                            for (_, task) in guard.download_task.drain() {
                                task.abort();
                            }
                        });
                    });
                }
                tauri::WindowEvent::Focused(true) => {
                    tokio::task::block_in_place(|| {
                        tokio::runtime::Handle::current().block_on(async {
                            let _ = app.start_server(None).await;
                        });
                    });
                }
                _ => {}
            }
        }
        _ => {}
    }
}
