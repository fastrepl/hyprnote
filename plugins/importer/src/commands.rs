use crate::ext::ImporterPluginExt;
use crate::types::{ImportSourceInfo, ImportSourceKind};

#[tauri::command]
#[specta::specta]
pub async fn list_available_sources<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<Vec<ImportSourceInfo>, String> {
    let sources = app.importer().list_available_sources();
    Ok(sources)
}

#[tauri::command]
#[specta::specta]
pub async fn run_import<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    source: ImportSourceKind,
) -> Result<(), String> {
    app.importer()
        .run_import(source)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn run_import_dry<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    source: ImportSourceKind,
) -> Result<(), String> {
    app.importer()
        .run_import_dry(source)
        .await
        .map_err(|e| e.to_string())
}
