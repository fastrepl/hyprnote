#[tauri::command]
#[specta::specta]
#[tracing::instrument(skip_all)]
pub(crate) async fn load_model(
    _state: tauri::State<'_, crate::State>,
    _on_progress: tauri::ipc::Channel<u8>,
) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn unload_model(_state: tauri::State<'_, crate::State>) -> Result<(), String> {
    Ok(())
}
