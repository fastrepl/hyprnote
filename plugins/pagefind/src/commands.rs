use crate::{IndexRecord, PagefindPluginExt};

#[tauri::command]
#[specta::specta]
pub(crate) async fn build_index<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    records: Vec<IndexRecord>,
) -> Result<(), String> {
    app.pagefind()
        .build_index(records)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) fn get_bundle_path<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<String, String> {
    app.pagefind().get_bundle_path().map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub(crate) fn clear_index<R: tauri::Runtime>(app: tauri::AppHandle<R>) -> Result<(), String> {
    app.pagefind().clear_index().map_err(|e| e.to_string())
}
