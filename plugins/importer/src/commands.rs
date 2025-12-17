use crate::types::{ImportSourceInfo, ImportSourceKind};

#[tauri::command]
#[specta::specta]
pub async fn list_available_sources<R: tauri::Runtime>(
    _app: tauri::AppHandle<R>,
) -> Result<Vec<ImportSourceInfo>, String> {
    let sources = crate::sources::list_available_sources();
    Ok(sources)
}

#[tauri::command]
#[specta::specta]
pub async fn run_import<R: tauri::Runtime>(
    _app: tauri::AppHandle<R>,
    _source: ImportSourceKind,
) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn run_import_dry<R: tauri::Runtime>(
    _app: tauri::AppHandle<R>,
    _source: ImportSourceKind,
) -> Result<(), String> {
    Ok(())
}
