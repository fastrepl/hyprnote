use tauri::{command, AppHandle, Runtime};

#[command]
pub(crate) async fn start_session<R: Runtime>(app: AppHandle<R>) -> crate::Result<()> {
    Ok(())
}

#[command]
pub(crate) async fn stop_session<R: Runtime>(app: AppHandle<R>) -> crate::Result<()> {
    Ok(())
}
