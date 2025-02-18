use tauri::Manager;

fn create_loading_handler(
    on_progress: tauri::ipc::Channel<u8>,
) -> impl FnMut(rwhisper::ModelLoadingProgress) {
    move |progress| {
        let percentage = match progress {
            rwhisper::ModelLoadingProgress::Downloading { .. } => 0,
            rwhisper::ModelLoadingProgress::Loading { .. } => 100,
        };
        let _ = on_progress.send(percentage);
    }
}

#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip_all)]
pub async fn load_model<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    state: tauri::State<'_, crate::SharedState>,
    on_progress: tauri::ipc::Channel<u8>,
) -> Result<(), String> {
    let dir = app.path().app_data_dir().unwrap();
    let cache = kalosm_common::Cache::new(dir);

    let model = rwhisper::WhisperBuilder::default()
        .with_source(rwhisper::WhisperSource::Tiny)
        .with_cache(cache)
        .build_with_loading_handler(create_loading_handler(on_progress))
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
