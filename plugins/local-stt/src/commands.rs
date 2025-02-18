use tauri::Manager;

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip_all)]
pub async fn load_model<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    state: tauri::State<'_, crate::SharedState>,
    on_progress: tauri::ipc::Channel<u8>,
) -> Result<(), String> {
    let data_dir = app.path().app_data_dir().unwrap();

    let model = crate::model::model_builder(data_dir)
        .with_source(rwhisper::WhisperSource::Tiny)
        .build_with_loading_handler(crate::model::make_progress_handler(on_progress))
        .await
        .map_err(|e| e.to_string())?;

    let mut s = state.lock().map_err(|e| e.to_string())?;
    s.model = Some(model);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn unload_model(state: tauri::State<'_, crate::SharedState>) -> Result<(), String> {
    let mut s = state.lock().map_err(|e| e.to_string())?;
    s.model.take();

    Ok(())
}
