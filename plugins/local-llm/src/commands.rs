#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip_all)]
pub async fn stop_server(state: tauri::State<'_, crate::SharedState>) -> Result<(), String> {
    let mut state = state.lock().await;

    state.model.take();

    if let Some(server) = state.server.take() {
        server.shutdown().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip_all)]
pub async fn load_model(
    state: tauri::State<'_, crate::SharedState>,
    _on_progress: tauri::ipc::Channel<u8>,
) -> Result<(), String> {
    let mut state = state.lock().await;
    state.model = Some(crate::inference::Model::new().map_err(|e| e.to_string())?);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn unload_model(state: tauri::State<'_, crate::SharedState>) -> Result<(), String> {
    let mut state = state.lock().await;
    state.model = None;
    Ok(())
}
