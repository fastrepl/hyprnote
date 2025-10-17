use tauri_plugin_windows::AppWindow;

pub fn on_event<R: tauri::Runtime>(app: &tauri::AppHandle<R>, event: &tauri::RunEvent) {
    match event {
        tauri::RunEvent::WindowEvent { label, event, .. } => {
            let hypr_window = match label.parse::<AppWindow>() {
                Ok(window) => window,
                Err(e) => {
                    tracing::warn!("parse_error: {:?}", e);
                    return;
                }
            };

            if hypr_window != AppWindow::Main {
                return;
            }

            match event {
                tauri::WindowEvent::Focused(true) => {
                    tokio::task::block_in_place(|| {
                        tokio::runtime::Handle::current().block_on(async {
                            use crate::LocalSttPluginExt;
                            match app.start_server(None).await {
                                Ok(_) => tracing::info!("server_started"),
                                Err(e) => tracing::error!("server_start_failed: {:?}", e),
                            }
                        });
                    });
                }
                _ => {}
            }
        }
        _ => {}
    }
}
