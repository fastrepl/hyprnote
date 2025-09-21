use tauri::Manager;
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_listener::ListenerPluginExt;

#[cfg(target_os = "macos")]
pub fn create_quit_handler<R: tauri::Runtime>(
    app_handle: tauri::AppHandle<R>,
) -> impl Fn() -> bool {
    move || {
        let mut is_exit_intent = false;

        if let Some(shared_state) = app_handle.try_state::<tauri_plugin_listener::SharedState>() {
            if let Ok(guard) = shared_state.try_lock() {
                let state = tokio::task::block_in_place(|| {
                    tokio::runtime::Handle::current().block_on(guard.get_state())
                });

                if !matches!(state, tauri_plugin_listener::fsm::State::RunningActive) {
                    is_exit_intent = true;
                } else {
                    is_exit_intent = app_handle
                        .dialog()
                        .message("Hyprnote is currently recording.")
                        .title("Do you really want to quit?")
                        .buttons(tauri_plugin_dialog::MessageDialogButtons::OkCancelCustom(
                            "Quit".to_string(),
                            "Cancel".to_string(),
                        ))
                        .kind(tauri_plugin_dialog::MessageDialogKind::Info)
                        .blocking_show()
                }
            }
        }

        if is_exit_intent {
            for (_, window) in app_handle.webview_windows() {
                let _ = window.close();
            }

            let _ = app_handle.set_activation_policy(tauri::ActivationPolicy::Accessory);
            hypr_host::kill_processes_by_matcher(hypr_host::ProcessMatcher::Sidecar);

            let app_handle_clone = app_handle.clone();
            tokio::spawn(async move {
                let _ = app_handle_clone.stop_session().await;
            });
        }

        false
    }
}
