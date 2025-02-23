use crate::ServerSentEventPluginExt;

#[tauri::command]
#[specta::specta]
pub async fn fetch<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    req: crate::Request,
) -> Result<crate::Response, String> {
    app.fetch(req).await
}
