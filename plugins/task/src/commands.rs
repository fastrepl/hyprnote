use crate::TaskPluginExt;

#[tauri::command]
#[specta::specta]
pub async fn get_task<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    id: String,
) -> Result<crate::store::TaskRecord, String> {
    app.get_task(id)
        .ok_or(crate::Error::TaskNotFound.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn cancel_task<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    id: String,
) -> Result<(), String> {
    app.cancel_task(id)
        .map_err(|_| crate::Error::TaskNotFound.to_string())
}
