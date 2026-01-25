use crate::FsDbPluginExt;

#[tauri::command]
#[specta::specta]
pub(crate) async fn ping<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    payload: crate::models::PingRequest,
) -> Result<crate::models::PingResponse, String> {
    app.fs_db().ping(payload).map_err(|e| e.to_string())
}
