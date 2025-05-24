use crate::TaskPluginExt;

#[tauri::command]
#[specta::specta]
pub async fn get_task<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    id: String,
) -> Result<crate::store::TaskRecord, String> {
    app.get_task(id).ok_or("not found".into())
}

#[tauri::command]
#[specta::specta]
pub async fn cancel_task<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    id: String,
) -> Result<(), String> {
    app.cancel_task(id).map_err(|_| "not found".into())
}
